import { Link as RouterLink, useSearchParams } from 'react-router-dom';

// material-ui
import { Theme, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Button from '@mui/material/Button';
import CardMedia from '@mui/material/CardMedia';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';

// project imports
import { AuthProvider, APP_AUTH } from 'config';

// assets
import Jwt from 'assets/images/icons/jwt.svg';

interface LoginProps {
  currentLoginWith: string;
  flow?: 'login' | 'signup';
}

// ==============================|| SOCIAL BUTTON ||============================== //

export default function LoginProvider({ currentLoginWith, flow = 'login' }: LoginProps) {
  const theme = useTheme();
  const downLG = useMediaQuery((muiTheme: Theme) => muiTheme.breakpoints.down('lg'));

  const [searchParams] = useSearchParams();
  const auth = searchParams.get('auth'); // get auth and set route based on that

  const loginHandlers = {
    Jwt: APP_AUTH === AuthProvider.JWT ? '/login' : '/login?auth=jwt'
  };

  const buttonData = [
    { name: 'jwt', icon: Jwt, url: loginHandlers.Jwt }
  ];

  const currentLoginExists = buttonData.some((button) => button.name === currentLoginWith);

  return (
    <Stack
      direction="row"
      sx={{
        gap: 2,
        justifyContent: 'center',
        alignItems: 'stretch',
        flexWrap: 'nowrap',
        overflowX: 'auto',
        pb: 0.5,
        '&::-webkit-scrollbar': { height: 6 },
        '&::-webkit-scrollbar-thumb': { background: theme.palette.grey[300], borderRadius: 6 },
        '& .MuiButton-startIcon': { mr: { xs: 0, md: 1 }, ml: { xs: 0, sm: -0.5, md: 1 } }
      }}
    >
      {buttonData
        .filter((button) => {
          if (auth) {
            return button.name !== auth;
          }
          if (currentLoginExists) {
            return button.name !== currentLoginWith;
          }
          return button.name !== APP_AUTH;
        })
        .map((button) => (
          <Tooltip title={button.name} key={button.name}>
            <Button
              sx={{
                px: 3,
                py: 2.5,
                minWidth: 160,
                minHeight: 88,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                borderColor: theme.palette.grey[300],
                color: theme.palette.grey[900],
                bgcolor: 'background.paper',
                '&:hover': {
                  borderColor: theme.palette.grey[400],
                  backgroundColor: theme.palette.action.hover
                }
              }}
              variant="outlined"
              color="secondary"
              startIcon={<CardMedia component="img" src={button.icon} alt={button.name} sx={{ width: 22, height: 22 }} />}
              component={RouterLink}
              to={button.url}
              target="_blank"
            >
              {!downLG && button.name}
            </Button>
          </Tooltip>
        ))}
    </Stack>
  );
}
