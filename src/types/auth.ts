// third party
import firebase from 'firebase/compat/app';

// project imports
import { UserProfile } from 'types/user-profile';
import { PopupLoginOptions, RedirectLoginOptions } from '@auth0/auth0-react';

type CanRemove = {
  login?: (email: string, password: string) => Promise<void>;
  // register?: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  codeVerification?: (verificationCode: string) => Promise<void>;
  resendConfirmationCode?: () => Promise<void>;
  firebaseRegister?: (email: string, password: string) => Promise<firebase.auth.UserCredential>;
  firebaseEmailPasswordSignIn?: (email: string, password: string) => Promise<firebase.auth.UserCredential>;
  logoutAuth?: () => void;
  loginAuth?: (options?: PopupLoginOptions) => Promise<void>;
  loginWithRedirect?: (options?: RedirectLoginOptions) => Promise<void>;
  confirmRegister?: (email: string, code: string) => Promise<void>;
  forgotPassword?: (email: string) => Promise<void>;
  resendCodeRegister?: (email: string) => Promise<void>;
  newPassword?: (email: string, code: string, password: string) => Promise<void>;
  updatePassword?: (password: string) => Promise<void>;
  resetPassword?: (email: string) => Promise<void>;
  awsResetPassword?: (verificationCode: string, newPassword: string) => Promise<any>;
};

export interface JWTDataProps {
  userId: string;
}

export type JWTContextType = CanRemove & {
  isLoggedIn: boolean;
  isInitialized?: boolean;
  user?: UserProfile | null | undefined;
  // roleId: string | null;
  // companyId: string | null;
  logout: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, confirmPassword: string, firstName: string, lastName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: VoidFunction;
};

export interface InitialLoginContextProps {
  isLoggedIn: boolean;
  isInitialized?: boolean;
  user?: UserProfile | null | undefined;
}
