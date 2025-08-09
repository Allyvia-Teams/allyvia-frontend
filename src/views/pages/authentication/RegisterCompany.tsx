import { Link, useNavigate } from 'react-router-dom';

// material-ui
import {
  Box,
  FormHelperText,
  Button,
  TextField,
  Typography,
  Stack,
  Grid,
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';

// project imports
import AuthCardWrapper from './AuthCardWrapper';
import AnimateButton from 'ui-component/extended/AnimateButton';

import Logo from 'ui-component/Logo';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetcher } from 'utils/axios';
import useScriptRef from 'hooks/useScriptRef';
import { CompanyRole, type Company } from 'types/entities';

// third party
import * as Yup from 'yup';
import { Formik } from 'formik';
import axiosServices from 'utils/axios';
import { setCompanyId, setRoleId } from 'utils/authStorage';

export default function RegisterCompany() {
  const scriptedRef = useScriptRef();
  const navigate = useNavigate();

  const { isLoading, data } = useQuery<Company[]>({
    queryKey: ['company'],
    queryFn: () => fetcher('/company')
  });

  // Here we create the company, then on success get the admin role and store it for the header.
  const { mutateAsync } = useMutation({
    mutationFn: async (name: string) => await axiosServices.post('/company/', { name }),
    mutationKey: ['company'],
    onSuccess: async ({ data }) => {
      const companyRoles = await fetcher(`/role/company/${data.id}`);
      setCompanyId(data.id);

      const admin = companyRoles.filter((d: CompanyRole) => d.role_type === 'admin');
      setRoleId(admin[0].id);
    }
  });

  const registrationValidation = Yup.object()
    .shape({
      newCompany: Yup.string(),
      existingCompany: Yup.string()
    })
    .test('only-one-company', 'Select or create a company - not both', function (this: Yup.TestContext, values) {
      const { existingCompany, newCompany } = values as { existingCompany: string; newCompany: string };

      const hasExisting = !!existingCompany?.trim();
      const hasNew = !!newCompany?.trim();

      if ((hasExisting && hasNew) || (!hasExisting && !hasNew)) {
        return this.createError({ message: 'Please either select a company or create a new one - not both' });
      }
    });

  return (
    <>
      {!isLoading && (
        <Grid container direction="column" sx={{ justifyContent: 'flex-end' }}>
          <Grid size={12}>
            <Grid container sx={{ justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
              <Grid sx={{ m: { xs: 1, sm: 3 }, mb: 0 }}>
                <AuthCardWrapper>
                  <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                    <Grid sx={{ mb: 3, display: 'flex', justifyContent: 'center' }} size={12}>
                      <Link to="#" aria-label="theme logo">
                        <Logo collapsed={false} />
                      </Link>
                    </Grid>
                    <Grid size={{ sm: 12, lg: 10 }}>
                      <Formik
                        initialValues={{
                          existingCompany: '',
                          newCompany: '',
                          submit: null
                        }}
                        validationSchema={registrationValidation}
                        onSubmit={async (values, { setErrors, setStatus, setSubmitting }) => {
                          const trimmedNew = values.newCompany?.trim();
                          const trimmedExisting = values.existingCompany?.trim();

                          const hasNew = !!trimmedNew;
                          const hasExisting = !!trimmedExisting;

                          if ((hasNew && hasExisting) || (!hasNew && !hasExisting)) {
                            setErrors({
                              newCompany: 'Please either select or create a company, not both.',
                              existingCompany: 'Please either select or create a company, not both.'
                            });
                            return;
                          }

                          try {
                            const trimmedCompany = trimmedNew || trimmedExisting;
                            await mutateAsync(trimmedCompany);
                            if (scriptedRef.current) {
                              setStatus({ success: true });
                              setSubmitting(false);
                            }
                            navigate('/dashboard');
                          } catch (err: any) {
                            if (scriptedRef.current) {
                              setStatus({ success: false });
                              setErrors({ submit: err.message });
                              setSubmitting(false);
                            }
                          }
                        }}
                      >
                        {({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values }) => (
                          <form noValidate onSubmit={handleSubmit}>
                            {data && data.length > 0 && (
                              <>
                                <Grid size={12}>
                                  <Grid
                                    container
                                    direction={{ xs: 'column-reverse', md: 'row' }}
                                    sx={{ alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    <Grid>
                                      <Stack sx={{ alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                                        <Typography variant="caption" sx={{ fontSize: '16px', textAlign: { lg: 'inherit', md: 'center' } }}>
                                          Select one of your existing companies
                                        </Typography>
                                      </Stack>
                                    </Grid>
                                  </Grid>
                                </Grid>
                                <Grid size={12}>
                                  <FormControl fullWidth error={touched.existingCompany && Boolean(errors.existingCompany)}>
                                    <InputLabel id="company-name-select">Company Name</InputLabel>
                                    <Select
                                      name="existingCompany"
                                      aria-placeholder="Company Name"
                                      labelId="company-name-select"
                                      value={values.existingCompany}
                                      label="Company Name"
                                      onChange={handleChange}
                                      fullWidth
                                    >
                                      {data.map((d, i) => (
                                        <MenuItem value={d.name} onClick={handleChange} key={i}>
                                          {d.name}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                    {touched.existingCompany && errors.existingCompany && (
                                      <FormHelperText>{errors.existingCompany}</FormHelperText>
                                    )}
                                  </FormControl>
                                </Grid>
                                <Grid size={12} sx={{ my: 4 }}>
                                  <Grid container sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Grid size={5}>
                                      <Divider />
                                    </Grid>
                                    <Grid size={2} sx={{ textAlign: 'center' }}>
                                      <Typography>Or</Typography>
                                    </Grid>
                                    <Grid size={5}>
                                      <Divider />
                                    </Grid>
                                  </Grid>
                                </Grid>
                              </>
                            )}
                            <Grid size={12}>
                              <Grid
                                container
                                direction={{ xs: 'column-reverse', md: 'row' }}
                                sx={{ alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Grid>
                                  <Stack sx={{ alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography variant="caption" sx={{ fontSize: '16px', textAlign: { xs: 'center', md: 'inherit' } }}>
                                      Create your company
                                    </Typography>
                                  </Stack>
                                </Grid>
                              </Grid>
                            </Grid>
                            <Grid container spacing={{ xs: 0, sm: 2 }}>
                              <Grid size={12}>
                                <TextField
                                  fullWidth
                                  label="Company Name"
                                  margin="normal"
                                  name="newCompany"
                                  type="text"
                                  value={values.newCompany}
                                  onBlur={handleBlur}
                                  onChange={handleChange}
                                  error={touched.newCompany && Boolean(errors.newCompany)}
                                  helperText={touched.newCompany && errors.newCompany}
                                />
                              </Grid>
                            </Grid>
                            <Box sx={{ mt: 5, justifyItems: 'center' }}>
                              <AnimateButton>
                                <Button
                                  disableElevation
                                  disabled={isSubmitting}
                                  size="large"
                                  type="submit"
                                  variant="contained"
                                  color="primary"
                                >
                                  Submit
                                </Button>
                              </AnimateButton>
                            </Box>
                          </form>
                        )}
                      </Formik>
                    </Grid>
                    <Grid size={12}>
                      <Divider />
                    </Grid>
                  </Grid>
                </AuthCardWrapper>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      )}
    </>
  );
}
