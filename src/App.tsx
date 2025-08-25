import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';

import router from 'routes';

import Locales from 'ui-component/Locales';
import NavigationScroll from 'layout/NavigationScroll';
import Snackbar from 'ui-component/extended/Snackbar';
import Notistack from 'ui-component/third-party/Notistack';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from 'utils/queryClient';

import ThemeCustomization from 'themes';

import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useDispatch } from 'store';
import { initializeAuth } from 'store/slices/auth';

// ==============================|| APP ||============================== //

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  return (
    <ThemeCustomization>
      <Locales>
        <NavigationScroll>
          <QueryClientProvider client={queryClient}>
            <Notistack>
              <ReactQueryDevtools initialIsOpen={false} />
              <RouterProvider router={router} />
              <Snackbar />
            </Notistack>
          </QueryClientProvider>
        </NavigationScroll>
      </Locales>
    </ThemeCustomization>
  );
}
