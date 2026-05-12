import { z } from "zod";

const EnquiryFormSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  countryCode: z.string().min(1),
  contactNumber: z.string().min(7, "Enter a valid contact number"),
  message: z.string().min(10, "Please add a short message"),
});

export type EnquiryFormValues = z.infer<typeof EnquiryFormSchema>;

export default EnquiryFormSchema;
