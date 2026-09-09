-- Photo-first memories: EXIF capture time, optional GPS, and day optional so a
-- photo that matches no trip day lands in the gallery's "needs a day" bucket.
alter table memories alter column day drop not null;
alter table memories add column if not exists taken_at timestamptz;
alter table memories add column if not exists lat double precision;
alter table memories add column if not exists lng double precision;
