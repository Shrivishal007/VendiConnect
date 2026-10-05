import Resident from '../models/Resident.js';

const NAME_MAX_LENGTH = 100;
const ADDRESS_MAX_LENGTH = 300;

// Type and length checks shared by sync and profile update. Returns an error message or null
function validateProfileText({ name, address }) {
  if (name !== undefined) {
    if (typeof name !== 'string') return 'name must be a string';
    if (name.trim().length > NAME_MAX_LENGTH) return `name must be at most ${NAME_MAX_LENGTH} characters`;
  }
  if (address !== undefined) {
    if (typeof address !== 'string') return 'address must be a string';
    if (address.trim().length > ADDRESS_MAX_LENGTH) return `address must be at most ${ADDRESS_MAX_LENGTH} characters`;
  }
  return null;
}

function serializeResident(resident) {
  return {
    Resident_ID: resident._id,
    Email: resident.Email,
    Name: resident.Name,
    Address: resident.Address,
    Latitude: resident.Latitude,
    Longitude: resident.Longitude,
    NotificationRadius: resident.NotificationRadius,
    hasLocation: resident.Latitude !== null && resident.Longitude !== null,
  };
}

export async function syncResident(req, res) {
  try {
    const firebaseUid = req.residentFirebaseUid;
    const claims = req.residentFirebaseClaims;

    const email = claims.email;

    if (!email) {
      return res.status(400).json({
        success: false,
        message:
          'This Firebase session has no email on file - sign in with email/password before syncing.',
      });
    }

    if (claims.email_verified === false) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address before continuing.',
      });
    }

    const { name, address, latitude, longitude } = req.body || {};

    const textError = validateProfileText({ name, address });
    if (textError) {
      return res.status(400).json({ success: false, message: textError });
    }
    if (latitude !== undefined || longitude !== undefined) {
      if (
        typeof latitude !== 'number' ||
        typeof longitude !== 'number' ||
        latitude < -90 || latitude > 90 ||
        longitude < -180 || longitude > 180
      ) {
        return res.status(400).json({
          success: false,
          message: 'latitude and longitude must both be numbers within valid range',
        });
      }
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check by FirebaseUID first (returning resident, same account)
    let resident = await Resident.findOne({ FirebaseUID: firebaseUid });

    // 2. Fall back to email (verified above) so a resident who re-created their
    //    Firebase account is re-linked instead of getting a duplicate profile
    if (!resident) {
      resident = await Resident.findOne({ Email: normalizedEmail });
    }

    if (resident) {
      let updated = false;
      if (resident.FirebaseUID !== firebaseUid) {
        resident.FirebaseUID = firebaseUid;
        updated = true;
      }
      if (resident.Email !== normalizedEmail) {
        resident.Email = normalizedEmail;
        updated = true;
      }
      if (name && name.trim() && resident.Name !== name.trim()) {
        resident.Name = name.trim();
        updated = true;
      }
      if (address !== undefined && resident.Address !== address.trim()) {
        resident.Address = address.trim();
        updated = true;
      }
      if (typeof latitude === 'number' && typeof longitude === 'number') {
        if (resident.Latitude !== latitude || resident.Longitude !== longitude) {
          resident.Latitude = latitude;
          resident.Longitude = longitude;
          updated = true;
        }
      }

      if (updated) {
        await resident.save();
      }

      return res.status(200).json({ success: true, message: 'Resident session synced', data: serializeResident(resident) });
    }

    // 3. New resident account creation
    const residentDoc = {
      FirebaseUID: firebaseUid,
      Email: normalizedEmail,
      Name: (name && name.trim()) || 'Resident',
      Address: (address && address.trim()) || '',
    };

    if (typeof latitude === 'number' && typeof longitude === 'number') {
      residentDoc.Latitude = latitude;
      residentDoc.Longitude = longitude;
    }

    resident = await Resident.create(residentDoc);

    return res.status(201).json({ success: true, message: 'Resident account created', data: serializeResident(resident) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account already exists for this email address' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: 'Validation failed', details: Object.values(err.errors).map((e) => e.message) });
    }
    console.error('[residentAuthController.syncResident]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getMyResidentProfile(req, res) {
  try {
    const resident = await Resident.findOne({ FirebaseUID: req.residentFirebaseUid });

    if (!resident) {
      return res.status(404).json({ success: false, message: 'No resident account found for this session - call /auth/sync first' });
    }

    return res.status(200).json({ success: true, data: serializeResident(resident) });
  } catch (err) {
    console.error('[residentAuthController.getMyResidentProfile]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function updateMyResidentProfile(req, res) {
  try {
    const { name, address, latitude, longitude, notificationRadius } = req.body || {};

    const textError = validateProfileText({ name, address });
    if (textError) {
      return res.status(400).json({ success: false, message: textError });
    }

    const update = {};
    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ success: false, message: 'name cannot be empty' });
      }
      update.Name = name.trim();
    }
    if (address !== undefined) update.Address = address.trim();

    if (latitude !== undefined || longitude !== undefined) {
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return res.status(400).json({ success: false, message: 'latitude and longitude must both be provided as numbers' });
      }
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({ success: false, message: 'latitude/longitude out of range' });
      }
      update.Latitude = latitude;
      update.Longitude = longitude;
    }

    if (notificationRadius !== undefined) {
      if (typeof notificationRadius !== 'number' || notificationRadius < 50 || notificationRadius > 5000) {
        return res.status(400).json({ success: false, message: 'notificationRadius must be between 50 and 5000 meters' });
      }
      update.NotificationRadius = notificationRadius;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: 'No updatable fields provided' });
    }

    const resident = await Resident.findOneAndUpdate(
      { FirebaseUID: req.residentFirebaseUid },
      { $set: update },
      { returnDocument: 'after', runValidators: true }
    );

    if (!resident) {
      return res.status(404).json({ success: false, message: 'No resident account found for this session - call /auth/sync first' });
    }

    return res.status(200).json({ success: true, message: 'Profile updated', data: serializeResident(resident) });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: 'Validation failed', details: Object.values(err.errors).map((e) => e.message) });
    }
    console.error('[residentAuthController.updateMyResidentProfile]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function updateMyFcmToken(req, res) {
  try {
    const { fcmToken } = req.body || {};

    if (!fcmToken || typeof fcmToken !== 'string') {
      return res.status(400).json({ success: false, message: 'fcmToken is required' });
    }

    const resident = await Resident.findOneAndUpdate(
      { FirebaseUID: req.residentFirebaseUid },
      { $set: { FcmToken: fcmToken } },
      { returnDocument: 'after' }
    );

    if (!resident) {
      return res.status(404).json({ success: false, message: 'No resident account found for this session - call /auth/sync first' });
    }

    return res.status(200).json({ success: true, message: 'FCM token updated' });
  } catch (err) {
    console.error('[residentAuthController.updateMyFcmToken]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
