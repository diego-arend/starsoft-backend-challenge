export const mockElasticsearchService = {
  search: jest.fn().mockResolvedValue({
    hits: {
      hits: [],
      total: { value: 0 },
    },
  }),
};
