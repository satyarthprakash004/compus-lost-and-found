const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

// Check if Cloudinary credentials are fully configured and not placeholder values
const isCloudinaryConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_API_SECRET !== 'your_api_secret_here';

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('✅ [Cloudinary] Configured and enabled.');
} else {
  console.log('⚠️ [Cloudinary] Missing credentials or using default placeholder. Falling back to local disk storage.');
}

// Ensure local uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Disk Storage config (always save locally first as a stage/fallback)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const prefix = file.fieldname === 'image' ? 'upload' : file.fieldname;
    cb(null, `${prefix}_${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Limit to images only
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|webp|gif/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only image files (jpeg, jpg, png, webp, gif) are allowed.'));
};

const upload = multer({
  storage: storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
  fileFilter: fileFilter
});

/**
 * Express middleware that uploads the file to Cloudinary (if configured)
 * and sets req.file.url to the uploaded image's URL.
 * Falls back to the local relative path if Cloudinary is not configured.
 */
const handleCloudinaryUpload = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  // Fallback if Cloudinary is not set up
  if (!isCloudinaryConfigured) {
    req.file.url = `/uploads/${req.file.filename}`;
    return next();
  }

  try {
    // Upload local file to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'campus-lost-found',
      resource_type: 'auto'
    });

    // Delete the local file after uploading to Cloudinary
    fs.unlink(req.file.path, (err) => {
      if (err) console.error(`❌ [File System] Error deleting temp local file: ${err.message}`);
    });

    // Add public URL to the request file object
    req.file.url = result.secure_url;
    next();
  } catch (error) {
    // Cleanup local file on failure
    fs.unlink(req.file.path, () => {});
    console.error('❌ [Cloudinary] Upload failed:', error);
    return res.status(500).json({ success: false, message: 'Image upload failed. Please try again.' });
  }
};

/**
 * Extracts Cloudinary public_id from a full secure URL.
 * Handles nested folders and extension stripping.
 */
function getPublicIdFromUrl(url) {
  if (!url || !url.includes('res.cloudinary.com')) return null;
  try {
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;

    let relevantParts = parts.slice(uploadIndex + 1);
    // Remove version component (e.g. v171638217) if it exists
    if (relevantParts[0] && relevantParts[0].startsWith('v') && /^\d+$/.test(relevantParts[0].substring(1))) {
      relevantParts = relevantParts.slice(1);
    }

    const fullPath = relevantParts.join('/');
    const lastDotIndex = fullPath.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      return fullPath.substring(0, lastDotIndex);
    }
    return fullPath;
  } catch (err) {
    console.error('Error parsing public_id from URL:', err);
    return null;
  }
}

/**
 * Deletes a file, either from local filesystem or Cloudinary,
 * based on the file URL format.
 */
const deleteFile = async (url) => {
  if (!url) return;

  if (url.startsWith('/uploads/')) {
    // Local file deletion
    const filename = url.replace('/uploads/', '');
    const filePath = path.join(__dirname, '..', 'uploads', filename);
    fs.unlink(filePath, (err) => {
      if (err) {
        if (err.code !== 'ENOENT') {
          console.error(`❌ [File System] Error deleting local file: ${err.message}`);
        }
      } else {
        console.log(`🧹 [File System] Deleted local file: ${filePath}`);
      }
    });
  } else if (url.includes('res.cloudinary.com')) {
    // Cloudinary file deletion
    if (!isCloudinaryConfigured) {
      console.warn('⚠️ [Cloudinary] Cannot delete from Cloudinary as credentials are not configured.');
      return;
    }

    const publicId = getPublicIdFromUrl(url);
    if (!publicId) return;

    try {
      const result = await cloudinary.uploader.destroy(publicId);
      console.log(`🧹 [Cloudinary] Deleted image: ${publicId}`, result);
    } catch (err) {
      console.error(`❌ [Cloudinary] Failed to delete image ${publicId}:`, err.message);
    }
  }
};

module.exports = {
  upload,
  handleCloudinaryUpload,
  deleteFile
};
