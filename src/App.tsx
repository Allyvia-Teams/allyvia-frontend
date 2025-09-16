import { RouterProvider } from 'react-router-dom';

// routing
import router from 'routes';

// project imports
import Locales from 'ui-component/Locales';
import NavigationScroll from 'layout/NavigationScroll';
import Snackbar from 'ui-component/extended/Snackbar';
import Notistack from 'ui-component/third-party/Notistack';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from 'utils/queryClient';

import ThemeCustomization from 'themes';

// auth provider
import { JWTProvider as AuthProvider } from 'contexts/JWTContext';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// ==============================|| APP ||============================== //

export default function App() {
  return (
    <ThemeCustomization>
      <Locales>
        <NavigationScroll>
          <AuthProvider>
            <QueryClientProvider client={queryClient}>
              <Notistack>
                <ReactQueryDevtools initialIsOpen={false} />
                <RouterProvider router={router} />
                <Snackbar />
              </Notistack>
            </QueryClientProvider>
          </AuthProvider>
        </NavigationScroll>
      </Locales>
    </ThemeCustomization>
  );
}
