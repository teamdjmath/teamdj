-- 고3 분반 학생은 학원 자체 교재 대신 외부 교재(수능특강 등)로 질문하는 경우가 많아, 질문
-- 등록 시 문제집을 "외부교재"로 선택할 수 있게 한다. textbooks는 이름만 갖는 전역 공용
-- 테이블이라(등급/분반 구분 없음) 별도 컬럼 추가 없이 이름으로 특수 처리한다 —
-- 앱 코드(new-question-form.tsx)에서 이 이름만 고3 분반일 때 골라 노출한다.
insert into public.textbooks (name)
values ('외부교재')
on conflict (name) do nothing;
