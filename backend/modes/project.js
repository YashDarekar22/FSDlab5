const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  image: String,
  sortOrder: Number

});

module.exports = mongoose.model('Product', productSchema);
