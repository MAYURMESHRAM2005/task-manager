import { useEffect, useState } from 'react';
import { subscribeToasts } from '../lib/toast';

/** Renders the `.toast-container` the original CSS expects. */
export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToasts((toast) => {
      setToasts((current) => [...current, toast]);
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== toast.id));
      }, 4000);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
