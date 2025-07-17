'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function InvitacionRedirect() {
  const params = useParams();
  const router = useRouter();
  
  useEffect(() => {
    if (params.token) {
      // Redirect to the actual invitation acceptance page
      router.replace(`/invitations?token=${params.token}`);
    }
  }, [params.token, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Procesando invitación...</h2>
        <p className="text-gray-600">Redirigiendo a la página de invitación</p>
      </div>
    </div>
  );
}