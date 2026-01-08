import { Search, Filter, X } from 'lucide-react';
import { useState } from 'react';

export interface FilterState {
  searchName: string;
  status: string;
  screenTimeMin: string;
  screenTimeMax: string;
  activeTimeMin: string;
  activeTimeMax: string;
  idleTimeMin: string;
  idleTimeMax: string;
  productivityMin: string;
  productivityMax: string;
  screenshotsMin: string;
  screenshotsMax: string;
}

interface DashboardFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
}

export function DashboardFilters({ filters, onFilterChange, onReset }: DashboardFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (key: keyof FilterState, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = () => {
    return filters.searchName !== '' || 
           filters.status !== 'all' ||
           filters.screenTimeMin !== '' ||
           filters.screenTimeMax !== '' ||
           filters.activeTimeMin !== '' ||
           filters.activeTimeMax !== '' ||
           filters.idleTimeMin !== '' ||
           filters.idleTimeMax !== '' ||
           filters.productivityMin !== '' ||
           filters.productivityMax !== '' ||
           filters.screenshotsMin !== '' ||
           filters.screenshotsMax !== '';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Filter className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-slate-900">Filter Employees</h3>
            <p className="text-slate-500">Refine your search with multiple criteria</p>
          </div>
        </div>
        
        {hasActiveFilters() && (
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
          >
            <X className="w-4 h-4" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Basic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Search by Name */}
        <div>
          <label className="block text-slate-700 mb-2">Search Name</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={filters.searchName}
              onChange={(e) => handleChange('searchName', e.target.value)}
              placeholder="Type employee name..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-slate-700 mb-2">Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="idle">Idle</option>
            <option value="offline">Offline</option>
          </select>
        </div>

        {/* Productivity Range */}
        <div>
          <label className="block text-slate-700 mb-2">Min Productivity %</label>
          <input
            type="number"
            value={filters.productivityMin}
            onChange={(e) => handleChange('productivityMin', e.target.value)}
            placeholder="e.g. 75"
            min="0"
            max="100"
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-slate-700 mb-2">Max Productivity %</label>
          <input
            type="number"
            value={filters.productivityMax}
            onChange={(e) => handleChange('productivityMax', e.target.value)}
            placeholder="e.g. 100"
            min="0"
            max="100"
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors mb-4"
      >
        <Filter className="w-4 h-4" />
        <span>{showAdvanced ? 'Hide' : 'Show'} Advanced Filters</span>
      </button>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
          {/* Screen Time */}
          <div>
            <label className="block text-slate-700 mb-2">Min Screen Time (hrs)</label>
            <input
              type="number"
              value={filters.screenTimeMin}
              onChange={(e) => handleChange('screenTimeMin', e.target.value)}
              placeholder="e.g. 5"
              step="0.1"
              min="0"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-slate-700 mb-2">Max Screen Time (hrs)</label>
            <input
              type="number"
              value={filters.screenTimeMax}
              onChange={(e) => handleChange('screenTimeMax', e.target.value)}
              placeholder="e.g. 10"
              step="0.1"
              min="0"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Active Time */}
          <div>
            <label className="block text-slate-700 mb-2">Min Active Time (hrs)</label>
            <input
              type="number"
              value={filters.activeTimeMin}
              onChange={(e) => handleChange('activeTimeMin', e.target.value)}
              placeholder="e.g. 4"
              step="0.1"
              min="0"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-slate-700 mb-2">Max Active Time (hrs)</label>
            <input
              type="number"
              value={filters.activeTimeMax}
              onChange={(e) => handleChange('activeTimeMax', e.target.value)}
              placeholder="e.g. 9"
              step="0.1"
              min="0"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Idle Time */}
          <div>
            <label className="block text-slate-700 mb-2">Min Idle Time (hrs)</label>
            <input
              type="number"
              value={filters.idleTimeMin}
              onChange={(e) => handleChange('idleTimeMin', e.target.value)}
              placeholder="e.g. 0"
              step="0.1"
              min="0"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-slate-700 mb-2">Max Idle Time (hrs)</label>
            <input
              type="number"
              value={filters.idleTimeMax}
              onChange={(e) => handleChange('idleTimeMax', e.target.value)}
              placeholder="e.g. 2"
              step="0.1"
              min="0"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Screenshots */}
          <div>
            <label className="block text-slate-700 mb-2">Min Screenshots</label>
            <input
              type="number"
              value={filters.screenshotsMin}
              onChange={(e) => handleChange('screenshotsMin', e.target.value)}
              placeholder="e.g. 1"
              min="0"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-slate-700 mb-2">Max Screenshots</label>
            <input
              type="number"
              value={filters.screenshotsMax}
              onChange={(e) => handleChange('screenshotsMax', e.target.value)}
              placeholder="e.g. 10"
              min="0"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}
    </div>
  );
}
