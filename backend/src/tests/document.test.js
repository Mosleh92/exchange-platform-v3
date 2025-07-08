require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const request = require("supertest");
const app = require("../server");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const tenantId = new mongoose.Types.ObjectId();
const branchId = new mongoose.Types.ObjectId();
const userId = new mongoose.Types.ObjectId();
const token = jwt.sign(
  { _id: userId, tenantId, branchId, role: "tenant_admin" },
  "testsecret",
);
const tokenOther = jwt.sign(
  {
    _id: new mongoose.Types.ObjectId(),
    tenantId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    role: "tenant_admin",
  },
  "testsecret",
);

describe("تست امنیت آپلود و دانلود فایل", () => {
  let uploadedId;

  it("نباید فایل با فرمت غیرمجاز آپلود شود", async () => {
    const res = await request(app)
      .post("/api/documents/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("dummy"), "malware.exe");
    expect(res.statusCode).toBe(400);
  });

  it("باید فایل مجاز (pdf) با موفقیت آپلود شود", async () => {
    const filePath = path.join(__dirname, "dummy.pdf");
    fs.writeFileSync(filePath, "dummy pdf content");
    const res = await request(app)
      .post("/api/documents/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", filePath);
    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBeDefined();
    uploadedId = res.body.id;
    fs.unlinkSync(filePath);
  });

  it("نباید کاربر غیرمجاز بتواند فایل tenant دیگر را دانلود کند", async () => {
    const res = await request(app)
      .get(`/api/documents/download/${uploadedId}`)
      .set("Authorization", `Bearer ${tokenOther}`);
    expect([403, 404]).toContain(res.statusCode);
  });

  it("کاربر مجاز باید بتواند فایل خود را دانلود کند", async () => {
    const res = await request(app)
      .get(`/api/documents/download/${uploadedId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-disposition"]).toContain("attachment");
  });
});
