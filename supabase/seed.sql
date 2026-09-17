-- Sample quiz so you have something to test with right after setup.
-- Run this after schema.sql, in the same SQL Editor.

insert into public.quizzes (slug, title, description, level, time_limit_minutes)
values (
  'vocabulary-builders-unit-1',
  'Vocabulary Builders — Unit 1 Check',
  'A short check on everyday vocabulary: food, routines and simple descriptions.',
  'A2–B1',
  15
)
on conflict (slug) do nothing;

-- Grab the quiz id we just created (or that already existed).
do $$
declare
  v_quiz_id uuid;
begin
  select id into v_quiz_id from public.quizzes where slug = 'vocabulary-builders-unit-1';

  -- Only seed questions if this quiz has none yet, so re-running is safe.
  if not exists (select 1 from public.questions where quiz_id = v_quiz_id) then

    insert into public.questions (quiz_id, order_index, type, prompt, explanation, points, data) values
    (v_quiz_id, 1, 'multiple_choice',
      'Which word means "a place where you can borrow books"?',
      '"Library" is a place that lends books; a "bookshop" sells them instead.',
      1,
      '{"options": ["Bookshop", "Library", "Museum", "Bakery"], "correctIndex": 1}'::jsonb),

    (v_quiz_id, 2, 'multiple_choice',
      'I usually ___ breakfast at seven o''clock.',
      'For routines and habits, use the simple present: "I have breakfast."',
      1,
      '{"options": ["have", "having", "has", "had"], "correctIndex": 0}'::jsonb),

    (v_quiz_id, 3, 'true_false',
      '"Enormous" means "very small".',
      '"Enormous" actually means very large — the opposite of small.',
      1,
      '{"correctAnswer": false}'::jsonb),

    (v_quiz_id, 4, 'true_false',
      'A "recipe" tells you how to cook a dish.',
      'Correct — a recipe lists the ingredients and steps for cooking something.',
      1,
      '{"correctAnswer": true}'::jsonb),

    (v_quiz_id, 5, 'fill_blank',
      'The opposite of "cheap" is ___.',
      '"Cheap" and "expensive" are opposites when talking about price.',
      1,
      '{"acceptedAnswers": ["expensive"]}'::jsonb),

    (v_quiz_id, 6, 'fill_blank',
      'She ___ (go) to the market every Sunday morning.',
      'Routine action, third person singular simple present: "goes".',
      1,
      '{"acceptedAnswers": ["goes"]}'::jsonb),

    (v_quiz_id, 7, 'sentence_completion',
      'Complete the sentence: "Before I leave the house, I always ___."',
      'Any complete, sensible routine action works, e.g. "check my bag" or "lock the door".',
      1,
      '{"acceptedAnswers": ["check my bag", "lock the door", "have breakfast", "brush my teeth"]}'::jsonb),

    (v_quiz_id, 8, 'matching',
      'Match each word to its meaning.',
      'Dog -> a common pet animal; Kitchen -> the room where you cook; Teacher -> a person who teaches; Umbrella -> what you use in the rain.',
      2,
      '{"pairs": [
        {"left": "Dog", "right": "A common pet animal"},
        {"left": "Kitchen", "right": "The room where you cook"},
        {"left": "Teacher", "right": "A person who teaches"},
        {"left": "Umbrella", "right": "What you use in the rain"}
      ]}'::jsonb);

  end if;
end $$;
