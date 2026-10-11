import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { comfortProfile, cravings } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { CravingsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function CravingsPage() {
  const user = await requireUser();
  const myCravings = await db.select().from(cravings).where(eq(cravings.userId, user.id)).orderBy(desc(cravings.createdAt));
  const profileRows = await db.select().from(comfortProfile).where(eq(comfortProfile.userId, user.id)).limit(1);
  const profile = profileRows[0] ?? null;

  return (
    <CravingsClient
      cravings={myCravings.map((c) => ({ id: c.id, item: c.item, category: c.category, shareWithPartner: c.shareWithPartner }))}
      profile={profile ? {
        favoriteSnacks: profile.favoriteSnacks, favoriteDrinks: profile.favoriteDrinks, comfortFoods: profile.comfortFoods,
        flowersOrSurprises: profile.flowersOrSurprises, comfortActivities: profile.comfortActivities, dislikes: profile.dislikes,
        dietaryRestrictions: profile.dietaryRestrictions, allergies: profile.allergies, preferredSupport: profile.preferredSupport,
      } : null}
    />
  );
}
