// src/routes/profile.js
import { Router } from 'express';
import { supabase } from '../config/supabase.js';

const router = Router();

const DEFAULT_PROFILE = {
  company_name: "Automotive Solutions India",
  gst_number: "07AAAAS9876M1ZX",
  phone: "+91 98123 45678",
  email: "r.kumar@autosolutions.in",
  address: "Plot 120, Sector 5, Sanjay Colony, Sector-23, Faridabad, Haryana - 121005",
  role: "client"
};

// Helper function to map database fields (snake_case) to client fields (camelCase)
const mapProfileResponse = (dbProfile) => {
  if (!dbProfile) return null;
  return {
    id: dbProfile.id,
    companyName: dbProfile.company_name,
    gstNumber: dbProfile.gst_number,
    phone: dbProfile.phone,
    email: dbProfile.email,
    address: dbProfile.address,
    role: dbProfile.role
  };
};

// GET /api/profile - Get profile details (automatically bootstrap if none exists)
router.get('/', async (req, res) => {
  try {
    const { data: profiles, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (error) {
      throw error;
    }

    let profile = profiles && profiles[0];

    // If no profile exists, seed a default one
    if (!profile) {
      const { data: newProfile, error: insertError } = await supabase
        .from('users')
        .insert([DEFAULT_PROFILE])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }
      profile = newProfile;
    }

    res.json({
      success: true,
      data: mapProfileResponse(profile)
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile from database',
      error: error.message
    });
  }
});

// PUT /api/profile - Update profile details
router.put('/', async (req, res) => {
  try {
    const {
      companyName,
      gstNumber,
      phone,
      email,
      address
    } = req.body;

    // Get current profile ID first
    const { data: profiles, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (fetchError) {
      throw fetchError;
    }

    let profileId = profiles && profiles[0]?.id;

    const profileData = {
      company_name: companyName,
      gst_number: gstNumber,
      phone,
      email,
      address
    };

    let result;

    if (!profileId) {
      // Create new if none exists
      const { data, error } = await supabase
        .from('users')
        .insert([profileData])
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      // Update existing
      const { data, error } = await supabase
        .from('users')
        .update(profileData)
        .eq('id', profileId)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: mapProfileResponse(result)
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile in database',
      error: error.message
    });
  }
});

export default router;
