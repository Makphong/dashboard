# Architecture Refactor Plan (Phase-by-Phase Checklist)

Purpose: ใช้เป็นแผนลงมือแก้โครงสร้างระบบแบบคุมความเสี่ยง แก้ทีละเฟส และเช็กครบก่อนข้ามเฟส

## Rules of Execution

- ทำงานทีละ Phase เท่านั้น
- ห้ามเริ่ม Phase ถัดไปจนกว่า Exit Criteria ของ Phase ปัจจุบันจะครบ
- ทุกการเปลี่ยนต้องไม่ทำให้ behavior เดิมของ dashboard เปลี่ยนโดยไม่ตั้งใจ
- ถ้าเจอ regression ให้หยุดและแก้ regression ในเฟสปัจจุบันทันที

## Phase Progress

- [ ] Phase 0 - Baseline and Safety Net
- [ ] Phase 1 - Security Boundary and API Hardening
- [ ] Phase 2 - Backend Modularization (No Behavior Change)
- [ ] Phase 3 - Frontend Decomposition (No UI Behavior Change)
- [ ] Phase 4 - Test and Quality Gates
- [ ] Phase 5 - Data and Configuration Hygiene + Final Cleanup

---

## Phase 0 - Baseline and Safety Net

Goal: ล็อก baseline ก่อน refactor เพื่อเทียบผลได้ทุกครั้ง

Scope:
- Backend API responses
- Frontend smoke flow
- Performance payload shape

Checklist:
- [ ] เก็บ baseline ของ `/api/health`, `/api/sources`, `/api/user-performance`, `/api/debug`
- [ ] เก็บ sample data อย่างน้อย 2 ชุด (เล็ก/กลาง) สำหรับ replay
- [ ] ทำ smoke checklist หน้า UI หลัก (filter, timeline, charts, upload/delete)
- [ ] ระบุ metrics ที่ต้องคงเดิม (เช่น `kpis`, จำนวน `segments`, `sourceSummary`)
- [ ] ตั้งกติกา regression log ไว้ในงานทุกเฟส
- [ ] บันทึก assumptions ที่มีผลต่อการ refactor

Exit Criteria:
- [ ] มี baseline artifacts พร้อมเทียบก่อน-หลัง
- [ ] ทีมเห็นตรงกันว่า baseline ใช้ตรวจ regression ได้จริง

---

## Phase 1 - Security Boundary and API Hardening

Goal: ปิดช่องเสี่ยงหลักก่อน (โดยเฉพาะ static serving และ write endpoints)

Scope Files:
- `backend/app/api.py`
- `vercel.json`
- `README.md` (เฉพาะส่วน deployment/security notes)

Checklist:
- [ ] ปรับ static serving ให้ไม่สามารถ path traversal ได้
- [ ] จำกัดไฟล์ static ที่อนุญาตให้เสิร์ฟ (allowlist)
- [ ] แยก route API ออกจาก fallback static ให้ชัดเจน
- [ ] เพิ่ม auth guard สำหรับ endpoint ที่แก้ข้อมูล (`upload`, `sync`, `delete`, `connect`)
- [ ] เพิ่ม request size/shape guard ขั้นพื้นฐานใน endpoint upload
- [ ] ทดสอบว่า dev/local flow ยังใช้ได้ตามเดิม
- [ ] อัปเดตเอกสารวิธีตั้งค่า auth สำหรับ production

Exit Criteria:
- [ ] ช่องเสี่ยง file traversal ถูกปิด
- [ ] write endpoints มีชั้นป้องกันขั้นต่ำ
- [ ] smoke test เดิมผ่านครบ

---

## Phase 2 - Backend Modularization (No Behavior Change)

Goal: แยก `core.py` เป็นชั้นงานชัดเจนโดยไม่เปลี่ยนผลลัพธ์ธุรกิจ

Scope Target Structure (proposed):
- `backend/app/db/`
- `backend/app/parsers/`
- `backend/app/services/analytics/`
- `backend/app/services/segmentation/`
- `backend/app/services/sync/`
- `backend/app/contracts/` (constants/types)

Checklist:
- [ ] แยก DB access และ schema init ออกจาก core monolith
- [ ] แยก parser (`xlsx/csv`) ออกจาก analytics logic
- [ ] แยก segmentation engine เป็นโมดูลเฉพาะ
- [ ] แยก response aggregation (`compute_user_performance`) เป็น service layer
- [ ] รวมแหล่ง schema definition ให้เหลือ single source-of-truth
- [ ] ลด logic ซ้ำระหว่าง Flask routes กับ standalone HTTP handler
- [ ] คง API contract เดิม (keys, field names, data types)
- [ ] เทียบ baseline จาก Phase 0 แล้วต้องตรง

Exit Criteria:
- [ ] โมดูล backend แยกตาม responsibility ชัดเจน
- [ ] API output เทียบ baseline ผ่าน
- [ ] ไม่มี behavior drift ใน KPI/segments

---

## Phase 3 - Frontend Decomposition (No UI Behavior Change)

Goal: แยก `frontend/src/app.jsx` ออกจาก monolith โดยคง UX เดิม

Scope Target Structure (proposed):
- `frontend/src/features/timeline/`
- `frontend/src/features/filters/`
- `frontend/src/features/charts/`
- `frontend/src/features/data-management/`
- `frontend/src/hooks/`
- `frontend/src/lib/` (utils/constants/api)

Checklist:
- [ ] แยก constants/config ออกจาก component tree
- [ ] แยก reusable utils (`format`, `mapping`, `segment helpers`) ไป `lib/`
- [ ] แยก chart components ออกจากไฟล์หลัก
- [ ] แยก timeline component และ interaction state ออกเป็น feature module
- [ ] ย้าย filter persistence logic เป็น custom hooks
- [ ] ลดจำนวน `useState` ใน root `App` โดยดันลง feature scope
- [ ] คง behavior เดิมของ filter/timeline/marker/kpi ทุกจุด
- [ ] ตรวจ mobile/desktop rendering ว่ายังเท่าเดิม

Exit Criteria:
- [ ] `app.jsx` เหลือเฉพาะ composition + orchestration
- [ ] ฟีเจอร์หลักยังทำงานเท่าเดิมทุก flow

---

## Phase 4 - Test and Quality Gates

Goal: เพิ่ม safety net อัตโนมัติสำหรับการแก้ระยะยาว

Scope:
- Backend tests เป็นขั้นต่ำก่อน
- Static checks และ CI commands

Checklist:
- [ ] เพิ่ม test backend สำหรับ parsing + segmentation + KPI aggregation (happy path + edge case)
- [ ] เพิ่ม API contract tests สำหรับ endpoint หลัก
- [ ] เพิ่ม regression tests จาก incident จริง (state classification/filter persistence)
- [ ] เพิ่ม lint/format/type checks ที่ทีมใช้งานได้จริง
- [ ] สร้างคำสั่งเดียวสำหรับ run checks ทั้งหมด
- [ ] บันทึก runbook เมื่อ test ล้มเหลว

Exit Criteria:
- [ ] มีชุด tests ที่จับ regression สำคัญได้
- [ ] มี quality gate ที่รันซ้ำได้ทุกเครื่อง

---

## Phase 5 - Data and Configuration Hygiene + Final Cleanup

Goal: เก็บรายละเอียดที่ทำให้ระบบดูแลง่ายขึ้นและลดความเสี่ยงข้อมูลหลุด

Scope Files:
- `.gitignore`
- `.env.example`
- `README.md`
- `vercel.json`
- `CODE_INDEX.md`

Checklist:
- [ ] ย้าย local DB path ให้ชัดเจนและไม่ track ไฟล์ฐานข้อมูลจริงใน repo
- [ ] ปรับ `.gitignore` ให้ครอบคลุม DB artifacts ที่ root และ temp
- [ ] รวม source-of-truth ของ frontend build version ให้มีจุดเดียว
- [ ] ทบทวน config ที่ควรแยก dev/prod
- [ ] อัปเดตเอกสาร deploy/run/debug ให้ตรงโครงสร้างใหม่
- [ ] อัปเดต `CODE_INDEX.md` ให้ตรง line count/โครงสร้างล่าสุด
- [ ] ปิดรายการ TODO ที่ค้างจากเฟสก่อนหน้า

Exit Criteria:
- [ ] โครงสร้าง, เอกสาร, และ config สอดคล้องกันทั้งหมด
- [ ] พร้อมเข้าสู่โหมด maintain ต่อเนื่อง

---

## Definition of Done (Whole Plan)

- [ ] ทุก Phase ถูกปิดด้วย checklist ครบ
- [ ] ไม่มี regression ใน flow หลักของ dashboard
- [ ] API contract สำคัญคงเดิมหรือมี migration note ชัดเจน
- [ ] เอกสารใน repo สะท้อนโครงสร้างจริง
