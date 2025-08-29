import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, CircularProgress } from '@mui/material';
import { Formik } from 'formik';
import * as Yup from 'yup';
import AnimateButton from 'ui-component/extended/AnimateButton';

interface CompanyFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  initialName?: string;
  isEdit?: boolean;
  isLoading?: boolean;
}

const validationSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required('Company name is required')
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name must be less than 100 characters')
});

export default function CompanyFormDialog({
  open,
  onClose,
  onSubmit,
  initialName = '',
  isEdit = false,
  isLoading = false
}: CompanyFormDialogProps) {
  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth sx={{ '& .MuiDialog-paper': { maxWidth: '750px' } }}>
      <DialogTitle>{isEdit ? 'Edit Company' : 'Create New Company'}</DialogTitle>
      <Formik
        initialValues={{ name: initialName }}
        validationSchema={validationSchema}
        enableReinitialize
        onSubmit={async (values, { setSubmitting }) => {
          try {
            await onSubmit(values.name.trim());
            onClose();
          } catch (error) {
            setSubmitting(false);
          }
        }}
      >
        {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
          <form onSubmit={handleSubmit}>
            <DialogContent sx={{ minHeight: '250px' }}>
              <Box mb={2}>
                <TextField
                  fullWidth
                  id="company-name"
                  name="name"
                  label="Company Name"
                  value={values.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.name && Boolean(errors.name)}
                  helperText={touched.name && errors.name}
                  disabled={isLoading || isSubmitting}
                  autoFocus
                />
              </Box>
              {!isEdit && (
                <Box>
                  <ul style={{ margin: 0, paddingLeft: 20, color: 'text.secondary' }}>
                    <li>You will automatically become the admin</li>
                    <li>You can invite team members after creation</li>
                    <li>Connect QuickBooks from the company dashboard</li>
                  </ul>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleClose} color="inherit" disabled={isLoading || isSubmitting}>
                Cancel
              </Button>
              <AnimateButton>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isLoading || isSubmitting}
                  startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : null}
                >
                  {isLoading ? 'Processing...' : `${isEdit ? 'Update' : 'Create'} Company`}
                </Button>
              </AnimateButton>
            </DialogActions>
          </form>
        )}
      </Formik>
    </Dialog>
  );
}
