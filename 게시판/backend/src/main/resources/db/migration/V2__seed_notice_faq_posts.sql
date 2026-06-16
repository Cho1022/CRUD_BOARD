insert into members (
  email,
  password_hash,
  nickname,
  profile_image_url,
  role,
  created_at,
  updated_at,
  deleted_at
) values (
  'system@board.local',
  '$2a$10$CwTycUXWue0Thq9StjUM0uJ8h7Wtp0HdDthqjzXrMJN9AqYq6V1Sa',
  '서비스운영자',
  '',
  'USER',
  now(),
  now(),
  null
) on conflict (email) do nothing;

insert into posts (
  member_id,
  title,
  content,
  post_type,
  image_url,
  canonical_url,
  is_public,
  published_at,
  view_count,
  accepted_comment_id,
  created_at,
  updated_at,
  deleted_at
) values
((select id from members where email = 'system@board.local'), '[공지] 커뮤니티 이용 규칙 안내',
'안녕하세요. 깨끗하고 편안한 게시판 문화를 위해 커뮤니티 이용 규칙을 안내드립니다.

욕설, 비방, 도배, 광고성 글은 사전 안내 없이 숨김 또는 삭제될 수 있습니다. 서로를 존중하는 표현을 사용해 주시고, 질문이나 답변을 남기실 때에는 다른 회원님들이 이해하기 쉽도록 구체적으로 작성해 주세요.

회원님들의 매너 있는 활동이 더 좋은 커뮤니티를 만드는 가장 큰 힘입니다. 늘 함께해 주셔서 감사합니다.',
'NOTICE', null, '/posts', true, now() - interval '6 days', 128, null, now() - interval '6 days', now() - interval '6 days', null),
((select id from members where email = 'system@board.local'), '[안내] 시스템 정기 점검 안내',
'안녕하세요. 더 안정적인 서비스를 제공하기 위해 시스템 정기 점검을 진행할 예정입니다.

점검 시간 동안에는 게시글 작성, 댓글 등록, 이미지 업로드 기능이 일시적으로 제한될 수 있습니다. 이미 작성된 게시글 조회는 상황에 따라 일부 지연될 수 있습니다.

점검 일시: 2026년 7월 3일 02:00 ~ 06:00

이용에 불편을 드려 죄송합니다. 더 나은 서비스 환경으로 찾아뵙겠습니다.',
'NOTICE', null, '/posts', true, now() - interval '5 days', 96, null, now() - interval '5 days', now() - interval '5 days', null),
((select id from members where email = 'system@board.local'), '[업데이트] 게시판 신규 기능 안내',
'안녕하세요. 회원님들의 의견을 반영하여 게시판에 새로운 기능이 추가되었습니다.

이제 댓글 추천 기능을 통해 도움이 되는 답변을 더 쉽게 확인하실 수 있으며, 이미지 다중 업로드 기능으로 게시글 내용을 더 풍부하게 작성하실 수 있습니다.

앞으로도 보내주시는 의견을 꼼꼼히 확인하여 더 편리한 게시판을 만들어 가겠습니다. 새 기능을 사용해 보시고 의견이 있으시면 언제든 남겨 주세요.',
'NOTICE', null, '/posts', true, now() - interval '4 days', 143, null, now() - interval '4 days', now() - interval '4 days', null),
((select id from members where email = 'system@board.local'), 'Q. 비밀번호를 잊어버렸어요',
'비밀번호를 잊으셨다면 로그인 화면 하단의 비밀번호 찾기 버튼을 이용해 주세요.

가입하신 이메일 주소를 입력하시면 본인 확인 절차 후 임시 비밀번호를 발송해 드립니다. 임시 비밀번호로 로그인하신 뒤에는 보안을 위해 마이페이지에서 새 비밀번호로 꼭 변경해 주세요.

이메일이 도착하지 않는 경우 스팸함을 먼저 확인해 주시고, 계속 문제가 발생하면 고객 지원 채널로 문의해 주세요.',
'FAQ', null, '/password/edit', true, now() - interval '3 days', 87, null, now() - interval '3 days', now() - interval '3 days', null),
((select id from members where email = 'system@board.local'), 'Q. 글이나 댓글은 어떻게 삭제하나요',
'작성하신 게시글과 댓글은 해당 화면의 수정 또는 삭제 메뉴에서 직접 관리하실 수 있습니다.

게시글은 상세 화면에서 삭제 버튼을 선택하시면 삭제할 수 있으며, 댓글은 댓글 영역의 관리 메뉴를 통해 삭제할 수 있습니다. 단, 다른 회원님이 작성한 글이나 댓글은 삭제하실 수 없습니다.

삭제한 내용은 복구가 어려울 수 있으니 신중하게 진행해 주세요.',
'FAQ', null, '/posts', true, now() - interval '2 days', 74, null, now() - interval '2 days', now() - interval '2 days', null),
((select id from members where email = 'system@board.local'), 'Q. 회원 탈퇴는 어떻게 하나요',
'회원 탈퇴는 마이페이지의 회원 정보 수정 메뉴 하단에서 진행하실 수 있습니다.

탈퇴가 완료되면 개인정보는 즉시 삭제되지만, 작성하신 게시글과 댓글은 게시판 흐름 유지를 위해 자동으로 삭제되지 않을 수 있습니다. 남기고 싶지 않은 게시글이나 댓글이 있다면 탈퇴 전에 먼저 삭제해 주세요.

탈퇴 전 필요한 정보가 있는지 한 번 더 확인해 주시기 바랍니다.',
'FAQ', null, '/profile/edit', true, now() - interval '1 day', 69, null, now() - interval '1 day', now() - interval '1 day', null);

insert into tags (name, created_at, updated_at, deleted_at) values
('공지', now(), now(), null),
('운영', now(), now(), null),
('점검', now(), now(), null),
('업데이트', now(), now(), null),
('FAQ', now(), now(), null),
('계정', now(), now(), null),
('게시글', now(), now(), null),
('회원탈퇴', now(), now(), null)
on conflict (name) do nothing;

insert into post_tags (post_id, tag_id, created_at, updated_at, deleted_at)
select p.id, t.id, now(), now(), null
from posts p
join tags t on (
  (p.title = '[공지] 커뮤니티 이용 규칙 안내' and t.name in ('공지', '운영')) or
  (p.title = '[안내] 시스템 정기 점검 안내' and t.name in ('공지', '점검')) or
  (p.title = '[업데이트] 게시판 신규 기능 안내' and t.name in ('공지', '업데이트')) or
  (p.title = 'Q. 비밀번호를 잊어버렸어요' and t.name in ('FAQ', '계정')) or
  (p.title = 'Q. 글이나 댓글은 어떻게 삭제하나요' and t.name in ('FAQ', '게시글')) or
  (p.title = 'Q. 회원 탈퇴는 어떻게 하나요' and t.name in ('FAQ', '회원탈퇴'))
)
where p.member_id = (select id from members where email = 'system@board.local')
on conflict (post_id, tag_id) do nothing;
