const mongoose = require('mongoose');

class BaseModel {
  static createSchema(definition, options = {}) {
    const schema = new mongoose.Schema({
      tenant_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
      },
      ...definition
    }, {
      timestamps: true,
      ...options
    });

    // اضافه کردن ایندکس ترکیبی برای tenant_id
    Object.keys(definition).forEach(field => {
      if (definition[field].index) {
        schema.index({ tenant_id: 1, [field]: 1 });
      }
    });

    // اضافه کردن middleware برای فیلتر tenant
    schema.pre('find', function() {
      if (!this._conditions.tenant_id && !this._conditions.$or) {
        throw new Error('tenant_id is required for queries');
      }
    });

    return schema;
  }
}

module.exports = BaseModel;