import mongoose, { Schema } from 'mongoose';

const ShareDesignSchema = new Schema({
    shortId: { type: String, required: true, unique: true },
    data: { 
        t: String,
        g: String,
        q: String,
        c: String,
        b: String,
        bc: String,
        img: String,
        u: String,
        es: Object,
        v: Object
    },
    createdAt: { type: Date, default: Date.now, expires: '30d' } 
});

const ShareDesign = mongoose.models.ShareDesign || mongoose.model('ShareDesign', ShareDesignSchema);
export default ShareDesign;
