// 답변 내용에 자동으로 붙는 인사말/맺음말 — 학생 화면과 조교 답변 작성 화면(입력 탭 미리보기 +
// 미리보기 탭)이 똑같은 로직을 써야 조교가 실제로 학생에게 뭐가 보내지는지 정확히 알 수 있다.

export type AnswerFormatInput = {
  content: string
  studentName: string
  taName: string
  taRole?: string
  taIsSuperAdmin?: boolean
  isAiDraft: boolean
  isTaReviewed: boolean
}

// 관리자는 "OO 조교"가 아니라 "관리자"로, 선생님은 "OO 선생"으로 자기소개한다.
function responderTitle(taName: string, taRole?: string, taIsSuperAdmin?: boolean): string {
  if (taIsSuperAdmin) return '관리자입니다.'
  if (taRole === 'teacher') return `**${taName}** 선생입니다.`
  return `**${taName}** 조교입니다.`
}

// 레거시 AI 답변 형식(### 칭찬 / ### 핵심 포인트 / ### 풀이)이면 그 본문만 추출, 아니면 그대로.
function extractBody(content: string): string {
  const praiseMatch = content.match(/### 칭찬\n([\s\S]*?)(?=\n### |$)/)
  const keyMatch = content.match(/### 핵심 포인트\n([\s\S]*?)(?=\n### |$)/)
  const solutionMatch = content.match(/### 풀이\n([\s\S]*?)(?=\n### |$)/)
  return (praiseMatch || keyMatch || solutionMatch)
    ? [praiseMatch?.[1]?.trim(), keyMatch?.[1]?.trim(), solutionMatch?.[1]?.trim()].filter(Boolean).join('\n\n')
    : content.trim()
}

export function buildAnswerParts(input: AnswerFormatInput): { greeting: string; body: string; closing: string } {
  const { content, studentName, taName, taRole, taIsSuperAdmin, isAiDraft, isTaReviewed } = input
  const body = extractBody(content)
  const name = studentName ? `**${studentName}**` : '학생'

  // 조교 검수 없이 학생이 AI 답변을 직접 확정한 경우 — "OO 조교입니다" 페르소나를 쓰면 안 되므로
  // 문구를 분리하고, 조교 미검수라는 사실을 명확히 고지한다 (인공지능기본법 제31조).
  if (isAiDraft && !isTaReviewed) {
    return {
      greeting: `안녕하세요 ${name} 학생,`,
      body,
      closing: `*이 답변은 AI가 자동으로 작성했으며, 조교의 검수를 거치지 않았습니다. (인공지능기본법 제31조에 따른 고지)*`,
    }
  }

  // AI 초안 고지는 실제로 AI 초안을 사용한 답변에만 표시 — 안 쓴 답변에 붙이면 사실과 다른 표시가 된다.
  const aiNotice = isAiDraft
    ? `\n\n*본 답변은 AI가 작성한 초안을 조교가 검수·수정한 것입니다. (인공지능기본법 제31조에 따른 고지)*`
    : ''
  return {
    greeting: `안녕하세요 ${name} 학생, ${responderTitle(taName, taRole, taIsSuperAdmin)}`,
    body,
    closing: `감사합니다. 더 궁금하신 내용이 있다면 언제든 질문해주시기 바랍니다.${aiNotice}`,
  }
}

export function buildStudentContent(input: AnswerFormatInput): string {
  const { greeting, body, closing } = buildAnswerParts(input)
  return `${greeting}\n\n${body}\n\n---\n${closing}`
}
