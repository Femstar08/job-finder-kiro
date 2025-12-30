import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  InputLabel,
  Chip,
  OutlinedInput,
  Grid,
  Paper,
  Typography,
  Switch,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import {
  JobPreferencesFormData,
  CONTRACT_TYPE_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS,
  COMPANY_SIZE_OPTIONS,
  CURRENCY_OPTIONS,
  ContractType,
  ExperienceLevel,
  CompanySize,
} from '../../types';

interface JobPreferencesFormProps {
  initialData?: Partial<JobPreferencesFormData>;
  onSubmit: (data: JobPreferencesFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

const JobPreferencesForm: React.FC<JobPreferencesFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save Preferences',
}) => {
  const [error, setError] = useState<string>('');

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<JobPreferencesFormData>({
    defaultValues: {
      profileName: initialData?.profileName || '',
      jobTitle: initialData?.jobTitle || '',
      keywords: initialData?.keywords || '',
      location: {
        city: initialData?.location?.city || '',
        state: initialData?.location?.state || '',
        country: initialData?.location?.country || '',
        remote: initialData?.location?.remote || false,
      },
      contractTypes: initialData?.contractTypes || [],
      salaryRange: {
        min: initialData?.salaryRange?.min || '',
        max: initialData?.salaryRange?.max || '',
        currency: initialData?.salaryRange?.currency || 'USD',
      },
      dayRateRange: {
        min: initialData?.dayRateRange?.min || '',
        max: initialData?.dayRateRange?.max || '',
        currency: initialData?.dayRateRange?.currency || 'USD',
      },
      experienceLevel: initialData?.experienceLevel || [],
      companySize: initialData?.companySize || [],
    },
  });

  const watchedContractTypes = watch('contractTypes');
  const isContractSelected = watchedContractTypes.includes('contract' as ContractType);

  const onFormSubmit = async (data: JobPreferencesFormData) => {
    setError('');
    try {
      await onSubmit(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving preferences');
    }
  };

  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h6" gutterBottom>
        {initialData ? 'Edit Job Preferences' : 'Create Job Preferences'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onFormSubmit)}>
        <Grid container spacing={3}>
          {/* Profile Name */}
          <Grid item xs={12}>
            <Controller
              name="profileName"
              control={control}
              rules={{ required: 'Profile name is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Profile Name"
                  error={!!errors.profileName}
                  helperText={errors.profileName?.message}
                  placeholder="e.g., Senior Developer Jobs"
                />
              )}
            />
          </Grid>

          {/* Job Title */}
          <Grid item xs={12}>
            <Controller
              name="jobTitle"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Job Title (Optional)"
                  placeholder="e.g., Software Engineer, Product Manager"
                  helperText="Leave empty to match any job title"
                />
              )}
            />
          </Grid>

          {/* Keywords */}
          <Grid item xs={12}>
            <Controller
              name="keywords"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Keywords"
                  placeholder="e.g., React, TypeScript, Node.js"
                  helperText="Comma-separated keywords to search for in job descriptions"
                  multiline
                  rows={2}
                />
              )}
            />
          </Grid>

          {/* Location */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Location Preferences
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Controller
                  name="location.city"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="City"
                      placeholder="e.g., San Francisco"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Controller
                  name="location.state"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="State/Province"
                      placeholder="e.g., California"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Controller
                  name="location.country"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Country"
                      placeholder="e.g., United States"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="location.remote"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Include remote positions"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Contract Types */}
          <Grid item xs={12}>
            <FormControl fullWidth error={!!errors.contractTypes}>
              <InputLabel>Contract Types</InputLabel>
              <Controller
                name="contractTypes"
                control={control}
                rules={{ required: 'At least one contract type must be selected' }}
                render={({ field }) => (
                  <Select
                    {...field}
                    multiple
                    input={<OutlinedInput label="Contract Types" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip
                            key={value}
                            label={CONTRACT_TYPE_OPTIONS.find(opt => opt.value === value)?.label}
                            size="small"
                          />
                        ))}
                      </Box>
                    )}
                  >
                    {CONTRACT_TYPE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              {errors.contractTypes && (
                <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                  {errors.contractTypes.message}
                </Typography>
              )}
            </FormControl>
          </Grid>

          {/* Salary Range */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Salary Range (Annual)
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <Controller
                  name="salaryRange.min"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Minimum"
                      type="number"
                      placeholder="50000"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <Controller
                  name="salaryRange.max"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Maximum"
                      type="number"
                      placeholder="100000"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <Controller
                  name="salaryRange.currency"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Currency</InputLabel>
                      <Select {...field} label="Currency">
                        {CURRENCY_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Day Rate Range (only show if contract is selected) */}
          {isContractSelected && (
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Day Rate Range
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={3}>
                  <Controller
                    name="dayRateRange.min"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Minimum"
                        type="number"
                        placeholder="300"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Controller
                    name="dayRateRange.max"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Maximum"
                        type="number"
                        placeholder="800"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Controller
                    name="dayRateRange.currency"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Currency</InputLabel>
                        <Select {...field} label="Currency">
                          {CURRENCY_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
              </Grid>
            </Grid>
          )}

          {/* Experience Level */}
          <Grid item xs={12}>
            <FormControl fullWidth error={!!errors.experienceLevel}>
              <InputLabel>Experience Level</InputLabel>
              <Controller
                name="experienceLevel"
                control={control}
                rules={{ required: 'At least one experience level must be selected' }}
                render={({ field }) => (
                  <Select
                    {...field}
                    multiple
                    input={<OutlinedInput label="Experience Level" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip
                            key={value}
                            label={EXPERIENCE_LEVEL_OPTIONS.find(opt => opt.value === value)?.label}
                            size="small"
                          />
                        ))}
                      </Box>
                    )}
                  >
                    {EXPERIENCE_LEVEL_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              {errors.experienceLevel && (
                <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                  {errors.experienceLevel.message}
                </Typography>
              )}
            </FormControl>
          </Grid>

          {/* Company Size */}
          <Grid item xs={12}>
            <FormControl fullWidth error={!!errors.companySize}>
              <InputLabel>Company Size</InputLabel>
              <Controller
                name="companySize"
                control={control}
                rules={{ required: 'At least one company size must be selected' }}
                render={({ field }) => (
                  <Select
                    {...field}
                    multiple
                    input={<OutlinedInput label="Company Size" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip
                            key={value}
                            label={COMPANY_SIZE_OPTIONS.find(opt => opt.value === value)?.label}
                            size="small"
                          />
                        ))}
                      </Box>
                    )}
                  >
                    {COMPANY_SIZE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              {errors.companySize && (
                <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                  {errors.companySize.message}
                </Typography>
              )}
            </FormControl>
          </Grid>

          {/* Form Actions */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isLoading}
              >
                {isLoading ? <CircularProgress size={24} /> : submitLabel}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default JobPreferencesForm;