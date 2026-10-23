import Resident from '../models/Resident.js';

const NAME_MAX_LENGTH = 100;
const ADDRESS_MAX_LENGTH = 300;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    const { name, address, latitude, longitude } = req.body || {};
    const { uid, email, name: firebaseName } = req.residentFirebaseClaims || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!uid || !EMAIL_PATTERN.test(normalizedEmail) || normalizedEmail.length > 254) {
      return res.status(401).json({ success: false, message: 'A valid Firebase email account is required' });
    }

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

    let resident = await Resident.findOne({ FirebaseUID: uid });
    if (!resident && req.residentFirebaseClaims.email_verified === true) {
      resident = await Resident.findOne({
        Email: normalizedEmail,
        $or: [{ FirebaseUID: { $exists: false } }, { FirebaseUID: null }],
      });
    }

    if (resident?.FirebaseUID && resident.FirebaseUID !== uid) {
      return res.status(409).json({ success: false, message: 'This resident profile is linked to another Firebase account' });
    }

    const isNewResident = !resident;
    if (!resident) {
      resident = new Resident({
        Name: name?.trim() || firebaseName?.trim() || normalizedEmail.split('@')[0],
        Email: normalizedEmail,
        FirebaseUID: uid,
        Address: address?.trim() || '',
        NotificationRadius: 300,
      });
    } else {
      resident.FirebaseUID = uid;
      resident.Email = normalizedEmail;
    }

    if (name?.trim()) resident.Name = name.trim();
    if (address !== undefined) resident.Address = address.trim();
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      resident.Latitude = latitude;
      resident.Longitude = longitude;
    }

    await resident.save();

    const serialized = serializeResident(resident);
    return res.status(isNewResident ? 201 : 200).json({
      success: true,
      message: isNewResident ? 'Resident account created' : 'Resident session synced',
      data: serialized,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'This email is already linked to another resident account' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        details: Object.values(err.errors).map((error) => error.message),
      });
    }
    console.error('[residentAuthController.syncResident]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getMyResidentProfile(req, res) {
  try {
    return res.status(200).json({ success: true, data: serializeResident(req.resident) });
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

    const resident = await Resident.findByIdAndUpdate(
      req.resident._id,
      { $set: update },
      { returnDocument: 'after', runValidators: true }
    );

    if (!resident) {
      return res.status(404).json({ success: false, message: 'Resident account not found' });
    }

    return res.status(200).json({ success: true, message: 'Profile updated', data: serializeResident(resident) });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        details: Object.values(err.errors).map((error) => error.message),
      });
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

    const resident = await Resident.findByIdAndUpdate(
      req.resident._id,
      { $set: { FcmToken: fcmToken } },
      { returnDocument: 'after' }
    );

    if (!resident) {
      return res.status(404).json({ success: false, message: 'Resident account not found' });
    }

    return res.status(200).json({ success: true, message: 'FCM token updated' });
  } catch (err) {
    console.error('[residentAuthController.updateMyFcmToken]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
