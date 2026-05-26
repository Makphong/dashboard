# Architecture Refactor Plan (Phase-by-Phase Checklist)

Purpose: ใช้เป็นแผนลงมือแก้โครงสร้างระบบแบบคุมความเสี่ยง แก้ทีละเฟส และเช็กครบก่อนข้ามเฟส

## Rules of Execution

- ทำงานทีละ Phase เท่านั้น
- ห้ามเริ่ม Phase ถัดไปจนกว่า Exit Criteria ของ Phase ปัจจุบันจะครบ
- ทุกการเปลี่ยนต้องไม่ทำให้ behavior เดิมของ dashboard เปลี่ยนโดยไม่ตั้งใจ
- ถ้าเจอ regression ให้หยุดและแก้ regression ในเฟสปัจจุบันทันที

## Phase Progress

- [x] Phase 0 - Baseline and Safety Net
- [x] Phase 1 - Security Boundary and API Hardening
- [x] Phase 2 - Backend Modularization (No Behavior Change)
- [ ] Phase 3 - Frontend Decomposition (No UI Behavior Change)
- [ ] Phase 4 - Test and Quality Gates
- [ ] Phase 5 - Data and Configuration Hygiene + Final Cleanup

---

## Phase 0 - Baseline and Safety Net

Goal: Lock baseline before refactor so every later phase can be compared precisely.

Scope:
- Backend API responses
- Frontend smoke flow
- Performance payload shape

Checklist:
- [x] Captured baseline for `/api/health`, `/api/sources`, `/api/user-performance`, `/api/debug`
- [x] Prepared at least 2 replay sample datasets (small/medium)
- [x] Created UI smoke checklist for key flows (filter, timeline, charts, upload/delete)
- [x] Locked metrics that must stay stable (`kpis`, `segments`, `sourceSummary`, parse stats)
- [x] Defined regression log policy for all next phases
- [x] Documented assumptions that affect refactor interpretation

Exit Criteria:
- [x] Baseline artifacts exist and are ready for before/after comparisons
- [x] Team confirms the baseline is sufficient for regression validation

Artifacts:
- `artifacts/phase0/baseline_api/baseline_manifest.json`
- `artifacts/phase0/baseline_api/api_health.json`
- `artifacts/phase0/baseline_api/api_sources.json`
- `artifacts/phase0/baseline_api/api_user_performance.json`
- `artifacts/phase0/baseline_api/api_debug.json`
- `artifacts/phase0/metrics_lock.json`
- `artifacts/phase0/sample_data/sample_small_replay.csv`
- `artifacts/phase0/sample_data/sample_medium_replay.csv`
- `artifacts/phase0/smoke_checklist.md`
- `artifacts/phase0/assumptions.md`
- `artifacts/phase0/regression_policy.md`
- `artifacts/phase0/regression_log.md`

---

## Phase 1 - Security Boundary and API Hardening

Goal: ปิดช่องเสี่ยงหลักก่อน (โดยเฉพาะ static serving และ write endpoints)

Scope Files:
- `backend/app/api.py`
- `vercel.json`
- `README.md` (เฉพาะส่วน deployment/security notes)

Checklist:
- [x] ปรับ static serving ให้ไม่สามารถ path traversal ได้
- [x] จำกัดไฟล์ static ที่อนุญาตให้เสิร์ฟ (allowlist)
- [x] แยก route API ออกจาก fallback static ให้ชัดเจน
- [x] เพิ่ม auth guard สำหรับ endpoint ที่แก้ข้อมูล (`upload`, `sync`, `delete`, `connect`)
- [x] เพิ่ม request size/shape guard ขั้นพื้นฐานใน endpoint upload
- [x] ทดสอบว่า dev/local flow ยังใช้ได้ตามเดิม
- [x] อัปเดตเอกสารวิธีตั้งค่า auth สำหรับ production

Exit Criteria:
- [x] ช่องเสี่ยง file traversal ถูกปิด
- [x] write endpoints มีชั้นป้องกันขั้นต่ำ
- [x] smoke test เดิมผ่านครบ

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

Completion Status (2026-05-26):
- [x] Split DB access and schema init from `core.py`
- [x] Split parser (`xlsx/csv`) into `backend/app/parsers/`
- [x] Split segmentation + event normalization engine into `backend/app/services/segmentation/`
- [x] Split response aggregation (`compute_user_performance`) into `backend/app/services/analytics/`
- [x] Reduced duplicate API payload assembly between Flask routes and standalone handler
- [x] Preserved API contract for `/api/health`, `/api/sources`, `/api/user-performance`, `/api/debug`
- [x] Baseline/metrics lock checks matched Phase 0 artifacts
- Note: this completion block is the canonical Phase 2 status.

Checklist:
- [x] แยก DB access และ schema init ออกจาก core monolith
- [x] แยก parser (`xlsx/csv`) ออกจาก analytics logic
- [x] แยก segmentation engine เป็นโมดูลเฉพาะ
- [x] แยก response aggregation (`compute_user_performance`) เป็น service layer
- [x] รวมแหล่ง schema definition ให้เหลือ single source-of-truth
- [x] ลด logic ซ้ำระหว่าง Flask routes กับ standalone HTTP handler
- [x] คง API contract เดิม (keys, field names, data types)
- [x] เทียบ baseline จาก Phase 0 แล้วต้องตรง

Exit Criteria:
- [x] โมดูล backend แยกตาม responsibility ชัดเจน
- [x] API output เทียบ baseline ผ่าน
- [x] ไม่มี behavior drift ใน KPI/segments

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
