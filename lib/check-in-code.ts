export type CheckInCodeMember = {
  id: string;
  card_code?: string | null;
};

export function getMemberCheckInCode(member: CheckInCodeMember) {
  const physicalCardCode = typeof member.card_code === "string" ? member.card_code.trim() : "";
  return physicalCardCode || member.id;
}
