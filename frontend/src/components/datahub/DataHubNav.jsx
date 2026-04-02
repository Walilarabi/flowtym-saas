import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Plugs, 
  ArrowsClockwise, 
  Database, 
  Key, 
  ChartLineUp,
  House,
  CaretRight
} from '@phosphor-icons/react';

const navItems = [
  { 
    id: 'overview', 
    label: 'Vue d\'ensemble', 
    path: '/datahub', 
    icon: House,
    exact: true
  },
  { 
    id: 'connectors', 
    label: 'Connecteurs', 
    path: '/datahub/connectors', 
    icon: Plugs 
  },
  { 
    id: 'sync', 
    label: 'Synchronisation', 
    path: '/datahub/sync', 
    icon: ArrowsClockwise 
  },
  { 
    id: 'data', 
    label: 'Données Unifiées', 
    path: '/datahub/data', 
    icon: Database 
  },
  { 
    id: 'api', 
    label: 'API & Marketplace', 
    path: '/datahub/api', 
    icon: Key 
  },
  { 
    id: 'monitoring', 
    label: 'Monitoring', 
    path: '/datahub/monitoring', 
    icon: ChartLineUp 
  },
];

export const DataHubNav = () => {
  const location = useLocation();
  
  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            
            return (
              <Link
                key={item.id}
                to={item.path}
                data-testid={`datahub-nav-${item.id}`}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-lg
                  transition-all duration-200 whitespace-nowrap
                  ${active 
                    ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
                  }
                `}
              >
                <Icon 
                  size={18} 
                  weight={active ? 'duotone' : 'regular'}
                  className={active ? 'text-violet-600 dark:text-violet-400' : ''}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export const DataHubBreadcrumb = ({ items }) => {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-6">
      <Link 
        to="/datahub" 
        className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
      >
        Data Hub
      </Link>
      {items?.map((item, index) => (
        <span key={index} className="flex items-center gap-2">
          <CaretRight size={12} />
          {item.path ? (
            <Link 
              to={item.path}
              className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-900 dark:text-slate-200 font-medium">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </div>
  );
};
