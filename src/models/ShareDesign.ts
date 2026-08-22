import mongoose, { Schema } from 'mongoose';

const ShareDesignSchema = new Schema({
    shortId: { type: String, required: true, unique: true },
    version: { type: Number, default: 1 }, // 1 = legacy 'data' shape, 2 = v2 CardModel
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, default: null }, // null = ephemeral (QR flow)
    slug: { type: String, default: null },
    name: { type: String, default: null },
    thumbnailUrl: { type: String, default: null },
    model: { type: Schema.Types.Mixed, default: null }, // v2 CardModel
    data: { // v1 legacy shape, optional now
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
    createdAt: { type: Date, default: Date.now }
});

// TTL: only ephemeral anonymous designs (userId === null) expire after 30 days.
// Saved designs in a user's library (userId !== null) persist indefinitely.
ShareDesignSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { userId: null } }
);

const ShareDesign = mongoose.models.ShareDesign || mongoose.model('ShareDesign', ShareDesignSchema);
export default ShareDesign;
