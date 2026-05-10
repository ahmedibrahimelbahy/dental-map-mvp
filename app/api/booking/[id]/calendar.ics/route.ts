import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateBookingIcs } from "@/lib/booking/ics";

/**
 * Returns an .ics file for the patient's booking. Patient must be
 * signed in and own the appointment. Used by the "Add to Calendar"
 * button on the booking success page and the patient's account.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  type Row = {
    id: string;
    patient_id: string;
    slot_start: string;
    slot_end: string;
    fee_at_booking_egp: number;
    clinic_dentist: {
      dentist: { name_en: string; name_ar: string } | null;
      clinic: {
        name_en: string;
        name_ar: string;
        address_en: string | null;
        address_ar: string | null;
      } | null;
    } | null;
  };

  const admin = createAdminClient();
  const { data: appt } = await admin
    .from("appointments")
    .select(
      `id, patient_id, slot_start, slot_end, fee_at_booking_egp,
       clinic_dentist:clinic_dentists(
         dentist:dentists(name_en, name_ar),
         clinic:clinics(name_en, name_ar, address_en, address_ar)
       )`
    )
    .eq("id", id)
    .returns<Row[]>()
    .maybeSingle();

  if (!appt || appt.patient_id !== auth.user.id) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ics = generateBookingIcs({
    appointmentId: appt.id,
    startIso: appt.slot_start,
    endIso: appt.slot_end,
    dentistName: appt.clinic_dentist?.dentist?.name_en ?? "Your dentist",
    clinicName: appt.clinic_dentist?.clinic?.name_en ?? "Dental Map clinic",
    clinicAddress: appt.clinic_dentist?.clinic?.address_en,
    feeEgp: appt.fee_at_booking_egp,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="dental-appointment.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
