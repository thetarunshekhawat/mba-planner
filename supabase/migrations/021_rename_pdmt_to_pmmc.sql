-- ============================================================
-- Product Management: PDMT -> PMMC
--
-- The published Block 21 timetable ("Term 4, Block 21 new.pdf") renames the
-- course from the provisional code used in the tentative term timetable.
-- data/courses.ts now carries PMMC, and app/api/chat/route.ts looks the outline
-- up by `code`, so this row has to follow or course-specific answers lose their
-- outline context. 009_course_outlines.sql still seeds the old code, hence the
-- rename here rather than an edit to an applied migration.
-- ============================================================

UPDATE course_outlines SET code = 'PMMC' WHERE code = 'PDMT';
