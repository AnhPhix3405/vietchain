const useCosmosBankV1Beta1 = () => {
  return {
    QueryAllBalances: (params: any) => ({ data: { pages: [] }, isLoading: false, error: null }),
    QueryBalance: (params: any) => ({ data: null, isLoading: false, error: null }),
  };
};
export default useCosmosBankV1Beta1;
