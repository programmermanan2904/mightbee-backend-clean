import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:      { type: String, required: true, minlength: 6, select: false },
 profession: { 
  type: String, 
  enum: ["student","researcher","developer","creator","business","other"], 
  default: "other" 
},
  preferredTone: { type: String, enum: ["concise","witty","scientific","strict","creative"], default: "concise" },
  avatar:        { type: String, default: "" },
}, { timestamps: true });

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model("User", userSchema);