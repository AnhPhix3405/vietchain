const useCosmosTxV1Beta1 = () => {
  return {
    ServiceGetTxsEvent: (params: any) => ({ data: { pages: [] }, isLoading: false, error: null }),
  };
};
export default useCosmosTxV1Beta1;
