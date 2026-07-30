import { supabase } from './src/config/supabase.js';

async function insertRoute() {
  const deliveryId = '3499c4af-e0ad-4091-8950-4b375f8be1ca';
  
  // A realistic route in New Delhi from Okhla towards Connaught Place
  const route = [
    { lat: 28.5273, lng: 77.2713 }, // Okhla Phase 1
    { lat: 28.5412, lng: 77.2621 }, // Kalkaji
    { lat: 28.5531, lng: 77.2589 }, // Nehru Place
    { lat: 28.5671, lng: 77.2435 }, // Lajpat Nagar
    { lat: 28.5839, lng: 77.2351 }, // Defense Colony
    { lat: 28.5992, lng: 77.2289 }, // India Gate
  ];

  // We need to fetch the employee_id assigned to this delivery
  const { data: delivery } = await supabase
    .from('deliveries')
    .select('employee_id')
    .eq('id', deliveryId)
    .single();

  if (!delivery) {
    console.log("Delivery not found");
    return;
  }

  const employeeId = delivery.employee_id;
  const now = Date.now();

  const logs = route.map((point, index) => {
    return {
      employee_id: employeeId,
      delivery_id: deliveryId,
      latitude: point.lat,
      longitude: point.lng,
      speed: 40 + Math.random() * 10,
      heading: 320, // generally North-West
      // Set timestamps so they appear in order, ending exactly now
      timestamp: new Date(now - (route.length - 1 - index) * 60000).toISOString()
    };
  });

  // Clear existing logs for this delivery to avoid clutter
  await supabase.from('employee_gps_logs').delete().eq('delivery_id', deliveryId);

  // Insert the new route
  const { data, error } = await supabase.from('employee_gps_logs').insert(logs).select();
  
  if (error) {
    console.error("Error inserting route:", error);
  } else {
    console.log("Successfully inserted a realistic GPS route with 6 points.");
  }
}

insertRoute();
