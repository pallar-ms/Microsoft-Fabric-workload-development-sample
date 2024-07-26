const Ajv = require('ajv');
// Load schemas
const convertItemSchema = require('./ConvertItem.schema.json');
const item1Schema = require('./Item.schema.json');
const productSchema = require('./Product.schema.json');

// Initialize validators
const validateConvertItem = new Ajv().compile(convertItemSchema);
const validateItem1 = new Ajv().compile(item1Schema);
const validateProduct = new Ajv().compile(productSchema);

// Load data
const convertItemData = require('./../Package/ConvertItem.json');
const item1Data = require('./../Package/Item1.json');
const productData = require('./../Package/Product.json');

// Validate ConvertItem
if (!validateConvertItem(convertItemData)) {
  console.error('Convert Item data is invalid:', validateConvertItem.errors);
  process.exit(1);
}
// Validate Item1
if (!validateItem1(item1Data)) {
  console.error('Item1 data is invalid:', validateItem1.errors);
  process.exit(1);
}

// Validate Product
if (!validateProduct(productData)) {
  console.error('Product data is invalid:', validateProduct.errors);
  process.exit(1);
}