import type { ActionHandler } from "../types";
import { researchCompany } from "../../ai/service";

export const researchCompanyHandler: ActionHandler = async ({ context }) => {
  const companyResearch = await researchCompany({
    originalEmail: context.originalEmail,
    summary: context.summary,
    senderName: context.senderName,
    senderCompany: context.senderCompany,
  });

  return {
    output: { companyResearch },
    updatedContext: { companyResearch },
  };
};
