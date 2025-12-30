import React from 'react';
import { useEffect, useState } from 'react';
import { Navigate, } from 'react-router-dom';
import { useSelector } from 'store';
import { useDispatch } from 'store';
import { checkSubscription, type SubscriptionStatusResponse } from 'store/slices/subscription';

type Props = { children: React.ReactElement };

export default function PaymentGuard({ children }: Props) {
  const dispatch = useDispatch();
  const [isPaymentVerified, setIsPaymentVerified] = useState<boolean | null>(null);
  const isLoggedIn = useSelector((s) => s.auth?.isLoggedIn);
  const user = useSelector((s) => s.auth?.user);

  useEffect(() => {
    const verifySubscription = async () => {
      try {
        const result = await dispatch(checkSubscription());
        if (checkSubscription.fulfilled.match(result)) {
          const data = result.payload as SubscriptionStatusResponse;
          const { status } = data;
          if (status === 'Active') setIsPaymentVerified(true);
          else setIsPaymentVerified(false);
        } else {
          throw new Error('Failed to verify subscription status. Please contact support.');
        }
      } catch (err) {
        console.error('Subscription verification error:', err);
      }
    };

    verifySubscription();
  }, [isLoggedIn, user]);

  // Still loading payment status
  if (isPaymentVerified === null) {
    return <div>Loading...</div>; // Or a proper loading component
  }

  // Payment not verified, redirect to payment plan selection
  if (!isPaymentVerified) {
    return <Navigate to="/payment-plan" replace />;
  }

  // Payment verified, allow access
  return children;
}