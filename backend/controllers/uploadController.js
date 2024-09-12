const uploadImage = (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    res.json({ imageUrl: `/uploads/${req.file.filename}` });
  };
  
  module.exports = {
    uploadImage
  };