import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  Paper,
  Typography,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { ApplicationStatus } from '../../types';

export interface JobFiltersState {
  search: string;
  status: ApplicationStatus | 'all';
  sourceWebsite: string;
  sortBy: 'foundAt' | 'jobTitle' | 'company' | 'applicationStatus';
  sortOrder: 'asc' | 'desc';
}

interface JobFiltersProps {
  filters: JobFiltersState;
  onFiltersChange: (filters: JobFiltersState) => void;
  sourceWebsites: string[];
  totalResults: number;
  isLoading?: boolean;
}

const statusOptions: { value: ApplicationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'not_applied', label: 'Not Applied' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewed', label: 'Interviewed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'offered', label: 'Offered' },
];

const sortOptions = [
  { value: 'foundAt', label: 'Date Found' },
  { value: 'jobTitle', label: 'Job Title' },
  { value: 'company', label: 'Company' },
  { value: 'applicationStatus', label: 'Status' },
];

const JobFilters: React.FC<JobFiltersProps> = ({
  filters,
  onFiltersChange,
  sourceWebsites,
  totalResults,
  isLoading = false,
}) => {
  const [expanded, setExpanded] = React.useState(false);

  const handleFilterChange = (key: keyof JobFiltersState, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      sourceWebsite: '',
      sortBy: 'foundAt',
      sortOrder: 'desc',
    });
  };

  const hasActiveFilters = filters.search || filters.status !== 'all' || filters.sourceWebsite;

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status !== 'all') count++;
    if (filters.sourceWebsite) count++;
    return count;
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      {/* Header with results count and expand button */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h6" component="h2">
            Job Matches
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isLoading ? 'Loading...' : `${totalResults} results`}
          </Typography>
          {hasActiveFilters && (
            <Chip
              label={`${getActiveFiltersCount()} filter${getActiveFiltersCount() > 1 ? 's' : ''} active`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>

        <Box display="flex" alignItems="center" gap={1}>
          {hasActiveFilters && (
            <Button
              size="small"
              startIcon={<ClearIcon />}
              onClick={handleClearFilters}
            >
              Clear Filters
            </Button>
          )}
          <IconButton
            onClick={() => setExpanded(!expanded)}
            size="small"
          >
            <FilterListIcon />
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>

      {/* Search bar - always visible */}
      <Box mb={2}>
        <TextField
          fullWidth
          placeholder="Search jobs by title, company, or description..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          size="small"
        />
      </Box>

      {/* Expandable filters */}
      <Collapse in={expanded}>
        <Box display="flex" flex-wrap="wrap" gap={2} mb={2}>
          {/* Status filter */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              {statusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Source website filter */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Source</InputLabel>
            <Select
              value={filters.sourceWebsite}
              label="Source"
              onChange={(e) => handleFilterChange('sourceWebsite', e.target.value)}
            >
              <MenuItem value="">All Sources</MenuItem>
              {sourceWebsites.map((website) => (
                <MenuItem key={website} value={website}>
                  {website.charAt(0).toUpperCase() + website.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Sort by */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={filters.sortBy}
              label="Sort By"
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            >
              {sortOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Sort order */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Order</InputLabel>
            <Select
              value={filters.sortOrder}
              label="Order"
              onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
            >
              <MenuItem value="desc">Newest First</MenuItem>
              <MenuItem value="asc">Oldest First</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default JobFilters;