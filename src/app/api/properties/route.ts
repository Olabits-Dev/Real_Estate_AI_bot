import { getCompanyByIdentifier } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { getPlanAccess } from "@/lib/plans";
import { getPrismaClient } from "@/lib/prisma";
import { extractRequestHost, isAuthorizedDomain } from "@/lib/domain";

type PropertiesRequestBody = {
  companyId?: string;
  apiKey?: string;
  title?: string;
  description?: string;
  price?: number;
  location?: string;
  propertyType?: string;
};

export async function POST(request: Request) {
  const prisma = getPrismaClient();
  const session = await getCurrentSession();
  const developerOverride = session?.user.role === "DEVELOPER";
  const body = (await request.json()) as PropertiesRequestBody;

  const company = await getCompanyByIdentifier({
    companyId: body.companyId,
    apiKey: body.apiKey,
  });

  if (!company) {
    return Response.json({ error: "Invalid company credentials." }, { status: 401 });
  }

  if (body.apiKey) {
    const requestHost = extractRequestHost(request);
    if (!isAuthorizedDomain(requestHost, company.authorizedDomain)) {
      return Response.json({ error: "Unauthorized origin for this API key." }, { status: 403 });
    }
  }

  const access = getPlanAccess(company.plan);
  if (!access.properties && !developerOverride) {
    return Response.json(
      { error: "Your current plan does not support property inventory management." },
      { status: 403 },
    );
  }

  if (
    !body.title ||
    !body.description ||
    !body.location ||
    !body.propertyType ||
    typeof body.price !== "number" ||
    Number.isNaN(body.price)
  ) {
    return Response.json({ error: "Missing property fields." }, { status: 400 });
  }

  const created = await prisma.property.create({
    data: {
      companyId: company.id,
      title: body.title.trim(),
      description: body.description.trim(),
      location: body.location.trim(),
      propertyType: body.propertyType.trim(),
      price: body.price,
      isAvailable: true,
    },
  });

  return Response.json({ property: created }, { status: 201 });
}
