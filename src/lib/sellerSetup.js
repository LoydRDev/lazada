export const isGeneratedSellerStore = (user) => user?.storeName === `${user?.name}'s Store`;
export const isGeneratedSellerBusiness = (user) => user?.businessName === `${user?.name}'s Business`;
export const isGeneratedSellerPermit = (user) => String(user?.idDocument || '').startsWith('PERMIT-');

export const isSellerSetupComplete = (user) => Boolean(
  user?.storeName &&
  user?.businessName &&
  user?.idDocument &&
  !isGeneratedSellerStore(user) &&
  !isGeneratedSellerBusiness(user) &&
  !isGeneratedSellerPermit(user)
);
