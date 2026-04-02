"""
Flowtym Data Hub - Fallback & Resilience System
Circuit breaker, retry logic, and fallback mechanisms
"""
from typing import Dict, Any, Optional, List, Callable, TypeVar, Generic
from datetime import datetime, timedelta
from pydantic import BaseModel
import asyncio
import logging
from enum import Enum
from functools import wraps
import random

logger = logging.getLogger(__name__)

T = TypeVar('T')


class CircuitState(str, Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open" # Testing recovery


class RetryStrategy(str, Enum):
    FIXED = "fixed"              # Fixed delay
    EXPONENTIAL = "exponential"  # Exponential backoff
    FIBONACCI = "fibonacci"      # Fibonacci sequence delay
    RANDOM = "random"            # Random jitter


class FailedRequest(BaseModel):
    """Failed request for dead letter queue"""
    id: str
    tenant_id: str
    connector_id: Optional[str] = None
    
    # Request info
    operation: str
    endpoint: Optional[str] = None
    payload: Dict[str, Any]
    
    # Failure info
    error_message: str
    error_code: Optional[str] = None
    
    # Retry info
    retry_count: int = 0
    max_retries: int = 3
    next_retry_at: Optional[datetime] = None
    
    # Timestamps
    failed_at: datetime
    last_retry_at: Optional[datetime] = None
    
    # Status
    status: str = "pending"  # pending, retrying, success, dead_letter


class CircuitBreakerConfig(BaseModel):
    """Circuit breaker configuration"""
    failure_threshold: int = 5      # Failures before opening
    success_threshold: int = 2      # Successes to close from half-open
    timeout_seconds: int = 60       # Time in open state before half-open
    half_open_max_calls: int = 3    # Max calls in half-open state


class CircuitBreaker:
    """
    Circuit breaker pattern implementation.
    
    States:
    - CLOSED: Normal operation, counting failures
    - OPEN: Rejecting requests, waiting for timeout
    - HALF_OPEN: Testing if service recovered
    """
    
    def __init__(
        self,
        name: str,
        config: Optional[CircuitBreakerConfig] = None
    ):
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.half_open_calls = 0
    
    def can_execute(self) -> bool:
        """Check if circuit allows execution"""
        if self.state == CircuitState.CLOSED:
            return True
        
        if self.state == CircuitState.OPEN:
            # Check if timeout elapsed
            if self.last_failure_time:
                elapsed = (datetime.utcnow() - self.last_failure_time).total_seconds()
                if elapsed >= self.config.timeout_seconds:
                    self._transition_to_half_open()
                    return True
            return False
        
        if self.state == CircuitState.HALF_OPEN:
            return self.half_open_calls < self.config.half_open_max_calls
        
        return False
    
    def record_success(self):
        """Record successful execution"""
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.config.success_threshold:
                self._transition_to_closed()
        elif self.state == CircuitState.CLOSED:
            # Reset failure count on success
            self.failure_count = 0
    
    def record_failure(self, error: Optional[Exception] = None):
        """Record failed execution"""
        self.failure_count += 1
        self.last_failure_time = datetime.utcnow()
        
        if self.state == CircuitState.HALF_OPEN:
            self._transition_to_open()
        elif self.state == CircuitState.CLOSED:
            if self.failure_count >= self.config.failure_threshold:
                self._transition_to_open()
        
        logger.warning(
            f"Circuit breaker '{self.name}': failure recorded. "
            f"Count: {self.failure_count}, State: {self.state.value}"
        )
    
    def _transition_to_open(self):
        """Transition to open state"""
        self.state = CircuitState.OPEN
        self.success_count = 0
        self.half_open_calls = 0
        logger.warning(f"Circuit breaker '{self.name}' OPENED")
    
    def _transition_to_half_open(self):
        """Transition to half-open state"""
        self.state = CircuitState.HALF_OPEN
        self.half_open_calls = 0
        self.success_count = 0
        logger.info(f"Circuit breaker '{self.name}' now HALF-OPEN")
    
    def _transition_to_closed(self):
        """Transition to closed state"""
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.half_open_calls = 0
        logger.info(f"Circuit breaker '{self.name}' CLOSED")
    
    def get_state(self) -> Dict[str, Any]:
        """Get current state"""
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "success_count": self.success_count,
            "last_failure": self.last_failure_time.isoformat() if self.last_failure_time else None
        }


class RetryHandler:
    """Handles retry logic with various strategies"""
    
    def __init__(
        self,
        max_retries: int = 3,
        strategy: RetryStrategy = RetryStrategy.EXPONENTIAL,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        jitter: bool = True
    ):
        self.max_retries = max_retries
        self.strategy = strategy
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.jitter = jitter
    
    def get_delay(self, attempt: int) -> float:
        """Calculate delay for retry attempt"""
        if self.strategy == RetryStrategy.FIXED:
            delay = self.base_delay
        
        elif self.strategy == RetryStrategy.EXPONENTIAL:
            delay = self.base_delay * (2 ** attempt)
        
        elif self.strategy == RetryStrategy.FIBONACCI:
            fib = [1, 1]
            for _ in range(attempt):
                fib.append(fib[-1] + fib[-2])
            delay = self.base_delay * fib[attempt]
        
        elif self.strategy == RetryStrategy.RANDOM:
            delay = random.uniform(self.base_delay, self.max_delay)
        
        else:
            delay = self.base_delay
        
        # Apply max cap
        delay = min(delay, self.max_delay)
        
        # Add jitter
        if self.jitter:
            jitter_amount = delay * 0.1
            delay += random.uniform(-jitter_amount, jitter_amount)
        
        return max(0, delay)
    
    async def execute_with_retry(
        self,
        func: Callable,
        *args,
        on_retry: Optional[Callable] = None,
        **kwargs
    ) -> Any:
        """Execute function with retry logic"""
        last_error = None
        
        for attempt in range(self.max_retries + 1):
            try:
                if asyncio.iscoroutinefunction(func):
                    return await func(*args, **kwargs)
                return func(*args, **kwargs)
            
            except Exception as e:
                last_error = e
                
                if attempt < self.max_retries:
                    delay = self.get_delay(attempt)
                    logger.warning(
                        f"Retry attempt {attempt + 1}/{self.max_retries} "
                        f"after {delay:.2f}s. Error: {str(e)}"
                    )
                    
                    if on_retry:
                        on_retry(attempt, e)
                    
                    await asyncio.sleep(delay)
        
        raise last_error


class FallbackManager:
    """Manages fallback responses and degraded operation"""
    
    def __init__(self):
        self.fallbacks: Dict[str, Callable] = {}
        self.cached_responses: Dict[str, Any] = {}
    
    def register_fallback(self, operation: str, fallback_func: Callable):
        """Register a fallback function for an operation"""
        self.fallbacks[operation] = fallback_func
    
    def cache_response(self, operation: str, response: Any):
        """Cache a successful response for fallback"""
        self.cached_responses[operation] = {
            "response": response,
            "cached_at": datetime.utcnow()
        }
    
    async def get_fallback(self, operation: str, *args, **kwargs) -> Optional[Any]:
        """Get fallback response"""
        # Try registered fallback first
        if operation in self.fallbacks:
            try:
                func = self.fallbacks[operation]
                if asyncio.iscoroutinefunction(func):
                    return await func(*args, **kwargs)
                return func(*args, **kwargs)
            except Exception as e:
                logger.error(f"Fallback error for {operation}: {e}")
        
        # Try cached response
        if operation in self.cached_responses:
            cached = self.cached_responses[operation]
            return cached["response"]
        
        return None


class ResilienceSystem:
    """
    Complete resilience system combining:
    - Circuit breakers
    - Retry handlers
    - Fallback mechanisms
    - Dead letter queue
    """
    
    def __init__(self, db=None):
        self.db = db
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self.retry_handler = RetryHandler()
        self.fallback_manager = FallbackManager()
    
    def get_circuit_breaker(
        self,
        name: str,
        config: Optional[CircuitBreakerConfig] = None
    ) -> CircuitBreaker:
        """Get or create circuit breaker"""
        if name not in self.circuit_breakers:
            self.circuit_breakers[name] = CircuitBreaker(name, config)
        return self.circuit_breakers[name]
    
    async def execute_resilient(
        self,
        operation: str,
        func: Callable,
        *args,
        circuit_name: Optional[str] = None,
        retry: bool = True,
        fallback: bool = True,
        **kwargs
    ) -> Any:
        """
        Execute function with full resilience:
        1. Check circuit breaker
        2. Execute with retry
        3. Return fallback on failure
        """
        cb_name = circuit_name or operation
        cb = self.get_circuit_breaker(cb_name)
        
        # Check circuit breaker
        if not cb.can_execute():
            logger.warning(f"Circuit breaker '{cb_name}' is open, using fallback")
            if fallback:
                return await self.fallback_manager.get_fallback(operation, *args, **kwargs)
            raise Exception(f"Circuit breaker '{cb_name}' is open")
        
        try:
            # Execute with or without retry
            if retry:
                result = await self.retry_handler.execute_with_retry(
                    func, *args, **kwargs
                )
            else:
                if asyncio.iscoroutinefunction(func):
                    result = await func(*args, **kwargs)
                else:
                    result = func(*args, **kwargs)
            
            # Record success
            cb.record_success()
            
            # Cache response for fallback
            self.fallback_manager.cache_response(operation, result)
            
            return result
        
        except Exception as e:
            cb.record_failure(e)
            
            # Try fallback
            if fallback:
                fallback_result = await self.fallback_manager.get_fallback(
                    operation, *args, **kwargs
                )
                if fallback_result is not None:
                    return fallback_result
            
            # Add to dead letter queue
            await self._add_to_dead_letter(operation, args, kwargs, e)
            raise
    
    async def _add_to_dead_letter(
        self,
        operation: str,
        args: tuple,
        kwargs: dict,
        error: Exception
    ):
        """Add failed request to dead letter queue"""
        if not self.db:
            return
        
        try:
            failed_request = {
                "operation": operation,
                "payload": {"args": str(args), "kwargs": kwargs},
                "error_message": str(error),
                "failed_at": datetime.utcnow().isoformat(),
                "status": "pending",
                "retry_count": 0,
                "max_retries": 3
            }
            await self.db.dh_dead_letter.insert_one(failed_request)
        except Exception as e:
            logger.error(f"Failed to add to dead letter queue: {e}")
    
    async def process_dead_letter_queue(self, processor: Callable):
        """Process items in dead letter queue"""
        if not self.db:
            return
        
        pending = await self.db.dh_dead_letter.find({
            "status": "pending",
            "retry_count": {"$lt": 3}
        }).to_list(length=100)
        
        for item in pending:
            try:
                # Update status
                await self.db.dh_dead_letter.update_one(
                    {"_id": item["_id"]},
                    {"$set": {"status": "retrying"}}
                )
                
                # Process
                await processor(item)
                
                # Mark success
                await self.db.dh_dead_letter.update_one(
                    {"_id": item["_id"]},
                    {"$set": {"status": "success"}}
                )
            
            except Exception as e:
                # Update retry count
                await self.db.dh_dead_letter.update_one(
                    {"_id": item["_id"]},
                    {
                        "$set": {
                            "status": "pending" if item["retry_count"] < 2 else "dead_letter",
                            "last_retry_at": datetime.utcnow().isoformat()
                        },
                        "$inc": {"retry_count": 1}
                    }
                )
    
    def get_all_circuit_states(self) -> Dict[str, Dict]:
        """Get state of all circuit breakers"""
        return {
            name: cb.get_state()
            for name, cb in self.circuit_breakers.items()
        }


# Decorator for resilient execution
def resilient(
    operation: str,
    circuit_name: Optional[str] = None,
    retry: bool = True,
    fallback: bool = True
):
    """Decorator to add resilience to async functions"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            system = get_resilience_system()
            return await system.execute_resilient(
                operation=operation,
                func=func,
                *args,
                circuit_name=circuit_name,
                retry=retry,
                fallback=fallback,
                **kwargs
            )
        return wrapper
    return decorator


# Global instance
_resilience_system: Optional[ResilienceSystem] = None


def get_resilience_system() -> ResilienceSystem:
    """Get or create resilience system"""
    global _resilience_system
    if _resilience_system is None:
        _resilience_system = ResilienceSystem()
    return _resilience_system


def init_resilience_system(db=None) -> ResilienceSystem:
    """Initialize resilience system with database"""
    global _resilience_system
    _resilience_system = ResilienceSystem(db=db)
    return _resilience_system
