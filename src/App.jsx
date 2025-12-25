import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function App() {
  const [status, setStatus] = useState('Checking connection...');

  useEffect(() => {
    async function checkConnection() {
      try {
        // Just try to select from the 'goals' table.
        // It will return empty (because no data + RLS), but if it doesn't crash, we are good.
        const { data, error } = await supabase.from('goals').select('*');
        if (error) throw error;
        setStatus('✅ Connected to Supabase successfully!');
      } catch (err) {
        setStatus('❌ Connection failed: ' + err.message);
      }
    }
    checkConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">
          2026 Goals Tracker
        </h1>
        <div className={`p-4 rounded-lg ${status.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {status}
        </div>
      </div>
    </div>
  );
}