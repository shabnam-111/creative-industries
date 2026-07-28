import { supabase } from './src/config/supabase.js';

async function addVehicles() {
  const vehicles = [
    { vehicle_number: 'HR-38-XY-1234' },
    { vehicle_number: 'HR-51-AB-1234' },
    { vehicle_number: 'DL-1M-AB-9876' },
    { vehicle_number: 'UP-16-CD-4567' }
  ];
  
  const { data, error } = await supabase.from('vehicles').insert(vehicles).select();
  if (error) {
    console.error('Error adding vehicles:', error);
  } else {
    console.log('Successfully added vehicles:', data.length);
  }
}

addVehicles();
