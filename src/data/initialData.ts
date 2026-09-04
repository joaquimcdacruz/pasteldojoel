import { MenuItem, Filling, Addon, CategoryItem, MenuItemFilling } from '@/types';

export const DEFAULT_INITIAL_CATEGORIES: CategoryItem[] = [
  { id: '73565aa7-3191-43e2-a3c0-2d3ec0d5ed26', name: 'PASTEIS SALGADOS', order: 0, syncStatus: 'synced' },
  { id: '3a2f0f65-924f-44d1-9454-8f74f22ef35b', name: 'PASTEIS DOCE', order: 1, syncStatus: 'synced' },
  { id: 'b69a8683-756b-4ba6-a054-47bd86e1d165', name: 'BEBIDAS', order: 2, syncStatus: 'synced' },
  { id: 'c74aa8f0-e47d-44fc-bed4-8029eb868a03', name: 'SALGADOS', order: 3, syncStatus: 'synced' },
  { id: '93334a24-2a00-45d8-85b4-12e58077e1b9', name: 'doces', order: 4, syncStatus: 'synced' },
  { id: '1b720fc2-5fc4-4a9a-9a3d-f26e3034fa5e', name: 'pastel grande', order: 5, syncStatus: 'synced' },
  { id: 'category-acrescimo', name: 'ACRÉSCIMO', order: 6, syncStatus: 'synced' }
];

export const DEFAULT_INITIAL_FILLINGS: Filling[] = [
  { id: '1166caac-01b6-4720-97a2-2ecc7af3b33f', name: 'Coca Lata', price: 0, inStock: true, syncStatus: 'synced' },
  { id: 'fa63419a-4606-4e70-869c-42033d8b6af4', name: 'Fanta Lata', price: 0, inStock: true, syncStatus: 'synced' },
  { id: '80f42a14-82ea-49c7-ae7d-5db805a7b2c9', name: 'Guaraná Lata', price: 0, inStock: true, syncStatus: 'synced' },
  { id: '13278aa2-c88c-405c-a82b-838669a8cc9e', name: 'Sprite Lata', price: 0, inStock: true, syncStatus: 'synced' },
  { id: 'c0caf44b-fd49-4686-87f1-9dc507b3100f', name: 'coca zero lata', price: 0, inStock: true, syncStatus: 'synced' },
  { id: 'bebdab05-74fc-40c5-bcdd-26c7ae2d175a', name: 'Guaraná 200ml', price: 0, inStock: true, syncStatus: 'synced' },
  { id: 'e13dd117-6073-416e-9ab7-d1c2cc2a62df', name: 'coca cola 200ml', price: 0, inStock: true, syncStatus: 'synced' },
  { id: '419f1f20-c96b-44d1-ad41-c170959239e5', name: 'Fanta Uva Lata', price: 0, inStock: true, syncStatus: 'synced' }
];

export const DEFAULT_INITIAL_ADDONS: Addon[] = [
  { id: '3ebf8b64-04cd-489c-b09f-33ccc5a410ba', name: 'CARNE', price: 3, order: 0, syncStatus: 'synced' },
  { id: '3c3a9ded-920a-440c-b2e1-9157d737b125', name: 'QUEIJO', price: 3, order: 1, syncStatus: 'synced' },
  { id: 'a7dfc14b-cce5-4f40-8f96-a62ddc777ab2', name: 'PIZZA', price: 3, order: 2, syncStatus: 'synced' },
  { id: '963aa51f-1c38-434e-8fde-af4c680b08c5', name: 'CATUPIRY', price: 3, order: 3, syncStatus: 'synced' },
  { id: '12b48247-28e0-44e3-9309-847ecc1bbbc9', name: 'BACON', price: 3, order: 4, syncStatus: 'synced' },
  { id: '7fb3ee40-7905-41c1-9443-fb211dfb1115', name: 'PALMITO', price: 3, order: 5, syncStatus: 'synced' },
  { id: 'f0b0e0d3-6acf-48b6-9e72-15195e724416', name: 'GRANDE', price: 5, order: 6, syncStatus: 'synced' },
  { id: '80bda1a1-a62b-49d0-ae86-98d26c65156f', name: 'GAIROVA', price: 3, order: 7, syncStatus: 'synced' },
  { id: '71b75955-7801-4e98-a0e9-9e68639dcd40', name: 'sem tomate', price: 0, order: 8, syncStatus: 'synced' },
  { id: '5bc9ddca-fd1d-4d97-a315-e0002bba97bf', name: 'sem tomate / oregano', price: 0, order: 9, syncStatus: 'synced' },
  { id: 'e96ae3e0-9e22-47f0-9038-ec8d787dd3b0', name: 'PRESUNTO', price: 3, order: 10, syncStatus: 'synced' },
  { id: 'ddc9eb64-3b33-4bd5-9328-314e1919cde1', name: 'FRANGO', price: 3, order: 11, syncStatus: 'synced' }
];

export const DEFAULT_INITIAL_PRODUCTS: MenuItem[] = [
  // DOCES
  { id: 'd8a1ebcf-cc90-43fd-b8e2-49acaabf4fb2', name: 'BALA MENTOS', description: '', price: 5, category: '93334a24-2a00-45d8-85b4-12e58077e1b9', imageUrl: '', order: 0, inStock: true, syncStatus: 'synced' },
  { id: '2568c908-ed28-4e3a-9854-f6eddc52181f', name: 'KIT BALA MENTOS', description: '', price: 10, category: '93334a24-2a00-45d8-85b4-12e58077e1b9', imageUrl: '', order: 0, inStock: true, syncStatus: 'synced' },
  { id: '3cb18791-0b9c-465e-a4e9-dd3f029a15e4', name: 'PAÇOCA KIT', description: '', price: 10, category: '93334a24-2a00-45d8-85b4-12e58077e1b9', imageUrl: '', order: 0, inStock: true, syncStatus: 'synced' },
  { id: '54d57778-ba5b-4e8f-aab6-ffe11d88794b', name: 'PAÇOCA ', description: '', price: 2, category: '93334a24-2a00-45d8-85b4-12e58077e1b9', imageUrl: '', order: 0, inStock: true, syncStatus: 'synced' },
  { id: '953064ec-8a67-48c7-824a-31c044c61459', name: 'KIT SONHO DE VALSA', description: '', price: 10, category: '93334a24-2a00-45d8-85b4-12e58077e1b9', imageUrl: '', order: 0, inStock: true, syncStatus: 'synced' },

  // PASTÉIS DOCE
  { id: 'ea925329-4206-40c0-9fc7-f5c63d34eb9a', name: 'BRIGADEIRO', description: 'BRIGADEIRO', price: 10, category: '3a2f0f65-924f-44d1-9454-8f74f22ef35b', imageUrl: '', order: 0, inStock: true, syncStatus: 'synced' },
  { id: 'aefa8e04-935c-44ee-992c-3535d9f66bb9', name: 'DOCE DE LEITE', description: 'DOCE DE LEITE', price: 10, category: '3a2f0f65-924f-44d1-9454-8f74f22ef35b', imageUrl: '', order: 1, inStock: true, syncStatus: 'synced' },
  { id: 'f9a2d063-9c34-4c6f-b0cc-75cdd4774c05', name: 'ROMEU & JULIETA', description: 'ROMEU E JULIETA', price: 10, category: '3a2f0f65-924f-44d1-9454-8f74f22ef35b', imageUrl: '', order: 2, inStock: true, syncStatus: 'synced' },

  // PASTÉIS SALGADOS
  { id: 'b51ee9d4-78e4-420a-b47e-88412a3a1d6b', name: 'CARNE', description: 'CARNE MOIDA', price: 10, category: '73565aa7-3191-43e2-a3c0-2d3ec0d5ed26', imageUrl: '', order: 0, inStock: true, syncStatus: 'synced' },
  { id: '5d51bfed-8d8f-48f2-99a8-b1cb5ea636a9', name: 'CARNE C/ QUEIJO', description: 'CARNE MOIDA\nQUEIJO', price: 10, category: '73565aa7-3191-43e2-a3c0-2d3ec0d5ed26', imageUrl: '', order: 1, inStock: true, syncStatus: 'synced' },
  { id: '20306e06-7a69-43cc-bfd7-dd9a36eb9beb', name: 'QUEIJO', description: 'QUEIJO MUSSARELA', price: 10, category: '73565aa7-3191-43e2-a3c0-2d3ec0d5ed26', imageUrl: '', order: 2, inStock: true, syncStatus: 'synced' },
  { id: '8a057083-3576-4121-bbf9-ba8d81f83dda', name: 'SO FRANGO', description: 'FRANGO DESFIADO', price: 10, category: '73565aa7-3191-43e2-a3c0-2d3ec0d5ed26', imageUrl: '', order: 3, inStock: true, syncStatus: 'synced' },
  { id: 'be894e7f-2b1f-48d1-8227-b9b20d1be42f', name: 'FRANGO C/ QUEIJO', description: 'FRANGO DESFIADO\nQUEIJO', price: 10, category: '73565aa7-3191-43e2-a3c0-2d3ec0d5ed26', imageUrl: '', order: 4, inStock: true, syncStatus: 'synced' },
  { id: 'af8d5097-6e64-4466-8f78-3796f143b854', name: 'FRANGO C/ CATUPIRY', description: 'FRANGO DESFIADO\nCATUPIRY', price: 10, category: '73565aa7-3191-43e2-a3c0-2d3ec0d5ed26', imageUrl: '', order: 5, inStock: true, syncStatus: 'synced' },
  { id: '558c122b-1d50-48d7-b510-5f4d72da9f24', name: 'PIZZA', description: 'MUSSARELA\nPRESUNTO\nOREGANO\nTOMATE', price: 10, category: '73565aa7-3191-43e2-a3c0-2d3ec0d5ed26', imageUrl: '', order: 6, inStock: true, syncStatus: 'synced' },
  { id: '5bc23ce4-8b77-4d86-9e0c-50862bd634af', name: 'PRESUNTO', description: '', price: 10, category: '73565aa7-3191-43e2-a3c0-2d3ec0d5ed26', imageUrl: '', order: 6, inStock: true, syncStatus: 'synced' },
  { id: 'a7d395f9-a7b2-44a8-9690-71f8f47489f5', name: 'BROCOLIS C/ QUEIJO', description: '', price: 10, category: '73565aa7-3191-43e2-a3c0-2d3ec0d5ed26', imageUrl: '', order: 7, inStock: true, syncStatus: 'synced' },
  { id: 'e6bb71cb-d05e-4986-8ff7-dad93cde9010', name: 'CARNE SECA', description: 'CARNE SECA \nQUEIJO', price: 15, category: '73565aa7-3191-43e2-a3c0-2d3ec0d5ed26', imageUrl: '', order: 7, inStock: true, syncStatus: 'synced' },
  { id: 'a4528e1c-ebfa-40a2-82fb-8dd14ee122d8', name: 'COSTELA', description: 'COSTELA DESFIADA', price: 15, category: '73565aa7-3191-43e2-a3c0-2d3ec0d5ed26', imageUrl: '', order: 8, inStock: true, syncStatus: 'synced' },
  { id: '7ce9a20b-de98-4ca0-b01c-338488aaf460', name: 'GAIROVA', description: 'GAIROVA TEMPERADA', price: 15, category: '73565aa7-3191-43e2-a3c0-2d3ec0d5ed26', imageUrl: '', order: 9, inStock: true, syncStatus: 'synced' },
  { id: '742559fe-d45c-4736-9fe0-763a8d15eb0e', name: 'PALMITO', description: 'PALMITO TEMPERADO', price: 15, category: '73565aa7-3191-43e2-a3c0-2d3ec0d5ed26', imageUrl: '', order: 10, inStock: true, syncStatus: 'synced' },
  { id: '0d18c43a-0612-4656-b27d-7e743c73ce84', name: 'CALABRESA', description: 'CALABRESA', price: 15, category: '73565aa7-3191-43e2-a3c0-2d3ec0d5ed26', imageUrl: '', order: 11, inStock: true, syncStatus: 'synced' },
  { id: 'bfdabdd6-49c2-4206-a8d3-8a05449714bb', name: 'BACALHAU', description: 'BACALHAU', price: 15, category: '73565aa7-3191-43e2-a3c0-2d3ec0d5ed26', imageUrl: '', order: 12, inStock: true, syncStatus: 'synced' },
  { id: '6018ce27-8298-4612-9604-2b14a62947fd', name: '4 QUEIJOS', description: '4 QUEIJOS', price: 15, category: '73565aa7-3191-43e2-a3c0-2d3ec0d5ed26', imageUrl: '', order: 13, inStock: true, syncStatus: 'synced' },
  { id: '7cc98dff-881a-47a7-963f-117d96b148c2', name: 'ESPECIAL', description: 'CARNE\nFRANGO\nTOMATE\nPRESUNTO\nMUSSARELA\n', price: 30, category: '73565aa7-3191-43e2-a3c0-2d3ec0d5ed26', imageUrl: '', order: 14, inStock: true, syncStatus: 'synced' },
  { id: '2527ba42-d7c4-4c77-a93a-eb1d688ed819', name: 'HOT DOG FRANGO', description: 'FRANGO\nSALSICHA\nPRESUNTO\nMUSSARELA\nBATATA PALHA\nMAIONESE\nMOSTARDA CATCHUP', price: 17, category: '73565aa7-3191-43e2-a3c0-2d3ec0d5ed26', imageUrl: '', order: 15, inStock: true, syncStatus: 'synced' },
  { id: '784536ec-112d-477f-9980-c2c318f5bcf6', name: 'HOT DOG CARNE', description: 'CARNE\nSALSICHA\nPRESUNTO\nMUSSARELA\nBATATA PALHA\nMAIONESE\nMOSTARDA CATCHUP', price: 17, category: '73565aa7-3191-43e2-a3c0-2d3ec0d5ed26', imageUrl: '', order: 16, inStock: true, syncStatus: 'synced' },
  { id: '85360906-1806-4c48-bf7a-a8e1c8bae0d4', name: 'MASSA DE PASTEL', description: 'MASSA 500GR', price: 15, category: '73565aa7-3191-43e2-a3c0-2d3ec0d5ed26', imageUrl: '', order: 17, inStock: true, syncStatus: 'synced' },
  { id: '52c676cc-e9e6-4822-a14b-8004e0c2109f', name: 'VENTO', description: 'PASTEL SEM RECHEIO', price: 5, category: '73565aa7-3191-43e2-a3c0-2d3ec0d5ed26', imageUrl: '', order: 17, inStock: true, syncStatus: 'synced' },
  { id: '1a6565e7-79a7-4d28-9ea0-d24640d9cbf1', name: 'PASTEL DO MARQUINHO', description: '', price: 18, category: '73565aa7-3191-43e2-a3c0-2d3ec0d5ed26', imageUrl: '', order: 19, inStock: true, syncStatus: 'synced' },

  // PASTEL GRANDE
  { id: 'debaf776-3f39-4838-a8c1-4bcb42b0fc7a', name: 'CARNE', description: '', price: 18, category: '1b720fc2-5fc4-4a9a-9a3d-f26e3034fa5e', imageUrl: '', order: 0, inStock: true, syncStatus: 'synced' },
  { id: '41555fb1-4e4d-4213-8946-ec10e82c18ba', name: 'SO FRANGO GRANDE', description: '', price: 18, category: '1b720fc2-5fc4-4a9a-9a3d-f26e3034fa5e', imageUrl: '', order: 0, inStock: true, syncStatus: 'synced' },
  { id: 'd5fd0ca2-dd0e-46c9-b940-1f2fa0165c1b', name: 'CARNE C/ QUEIJO GRANDE', description: '', price: 18, category: '1b720fc2-5fc4-4a9a-9a3d-f26e3034fa5e', imageUrl: '', order: 0, inStock: true, syncStatus: 'synced' },
  { id: '55f9934a-951c-4a8d-af72-8a52fd5a44f3', name: 'QUEIJO GRANDE', description: '', price: 18, category: '1b720fc2-5fc4-4a9a-9a3d-f26e3034fa5e', imageUrl: '', order: 0, inStock: true, syncStatus: 'synced' },
  { id: 'e18ce5de-0006-46a4-9561-6fdb24b6a2ad', name: 'FRANGO C/ QUEIJO GRANDE', description: '', price: 18, category: '1b720fc2-5fc4-4a9a-9a3d-f26e3034fa5e', imageUrl: '', order: 0, inStock: true, syncStatus: 'synced' },
  { id: 'dff1fa98-c6f1-4a31-b092-dfbb06e2ceba', name: 'FRANGO C/ CATUPIRY GRANDE', description: '', price: 18, category: '1b720fc2-5fc4-4a9a-9a3d-f26e3034fa5e', imageUrl: '', order: 0, inStock: true, syncStatus: 'synced' },
  { id: '8f4958f8-c77a-4271-86e4-ef01f80bd489', name: 'PIZZA GRANDE', description: '', price: 18, category: '1b720fc2-5fc4-4a9a-9a3d-f26e3034fa5e', imageUrl: '', order: 0, inStock: true, syncStatus: 'synced' },
  { id: 'd887102c-b83e-41eb-92a9-b11829987c25', name: 'PRESUNTO GRANDE', description: '', price: 18, category: '1b720fc2-5fc4-4a9a-9a3d-f26e3034fa5e', imageUrl: '', order: 0, inStock: true, syncStatus: 'synced' },

  // SALGADOS
  { id: '040aa1ea-9242-4b83-8169-3a411d492054', name: 'SALGADOS', description: '', price: 10, category: 'c74aa8f0-e47d-44fc-bed4-8029eb868a03', imageUrl: '', order: 0, inStock: true, syncStatus: 'synced' },
  { id: '69a397e0-d90f-4890-a0b9-7dab59d3aad2', name: 'MAIA', description: '', price: 10, category: 'c74aa8f0-e47d-44fc-bed4-8029eb868a03', imageUrl: '', order: 1, inStock: true, syncStatus: 'synced' },
  { id: '7234b24d-d845-44c7-baba-49e49a6866b0', name: 'COXINHA DE CARNE', description: '', price: 10, category: 'c74aa8f0-e47d-44fc-bed4-8029eb868a03', imageUrl: '', order: 2, inStock: true, syncStatus: 'synced' },
  { id: 'a80a4446-3aa5-4502-812e-e7d734a3d623', name: 'COXINHA DE FRANGO', description: '', price: 10, category: 'c74aa8f0-e47d-44fc-bed4-8029eb868a03', imageUrl: '', order: 3, inStock: true, syncStatus: 'synced' },
  { id: '0b289076-0cad-4893-9912-0a65c05c6107', name: 'RISOLIS DE CARNE', description: '', price: 10, category: 'c74aa8f0-e47d-44fc-bed4-8029eb868a03', imageUrl: '', order: 4, inStock: true, syncStatus: 'synced' },
  { id: 'f51d23d8-616b-43f1-94d7-78b95533374b', name: 'RISOLIS PRESUNTO/QUEIJO', description: '', price: 10, category: 'c74aa8f0-e47d-44fc-bed4-8029eb868a03', imageUrl: '', order: 5, inStock: true, syncStatus: 'synced' },
  { id: 'd91986d0-f934-495b-b1bc-e05c94bacad5', name: 'BOLINHO DE QUEIJO', description: '', price: 10, category: 'c74aa8f0-e47d-44fc-bed4-8029eb868a03', imageUrl: '', order: 6, inStock: true, syncStatus: 'synced' },
  { id: 'e985a8e0-c7c9-45e4-b9ae-6fd0bf6b3fd6', name: 'KIBE', description: '', price: 10, category: 'c74aa8f0-e47d-44fc-bed4-8029eb868a03', imageUrl: '', order: 7, inStock: true, syncStatus: 'synced' },

  // BEBIDAS
  { id: 'f3f96b07-32e1-4552-9f3e-b53f6e8dff38', name: 'ÁGUA S/ GÁS', description: '', price: 5, category: 'b69a8683-756b-4ba6-a054-47bd86e1d165', imageUrl: '', order: 0, inStock: true, syncStatus: 'synced' },
  { id: '7a96a03f-e7ce-4989-af45-355e2db8e63b', name: 'ÁGUA C/ GÁS', description: '', price: 6, category: 'b69a8683-756b-4ba6-a054-47bd86e1d165', imageUrl: '', order: 1, inStock: true, syncStatus: 'synced' },
  { id: '9d50acd4-8fc4-4b83-ab12-1aaeeaf3379c', name: 'REFRIERANTE 200ml', description: 'CAÇULINHA', price: 3.5, category: 'b69a8683-756b-4ba6-a054-47bd86e1d165', imageUrl: '', order: 2, inStock: true, syncStatus: 'synced' },
  { id: '0b7ae2d3-3e91-49c4-ab6c-67b0b245ce6f', name: 'REFRIGERANTE LATA', description: '350ML', price: 6, category: 'b69a8683-756b-4ba6-a054-47bd86e1d165', imageUrl: '', order: 3, inStock: true, syncStatus: 'synced' },
  { id: '422b5792-15b1-4cad-bcec-0ded12ee6525', name: 'REFRIGERANTE 600ml', description: 'COCA COLA', price: 8, category: 'b69a8683-756b-4ba6-a054-47bd86e1d165', imageUrl: '', order: 4, inStock: true, syncStatus: 'synced' },
  { id: '3c42e96e-a3d2-4377-81c7-5eba630b880a', name: 'guaraná 1 LITRO', description: 'GUARANÁ ANTARTICA', price: 10, category: 'b69a8683-756b-4ba6-a054-47bd86e1d165', imageUrl: '', order: 5, inStock: true, syncStatus: 'synced' },
  { id: '07230bc5-93e6-4109-aca0-845aa316c3ff', name: 'suco natural 500 ml', description: '', price: 10, category: 'b69a8683-756b-4ba6-a054-47bd86e1d165', imageUrl: '', order: 6, inStock: true, syncStatus: 'synced' },

  // ACRÉSCIMOS
  { id: 'f3ae2f44-d98b-471b-b914-79ee2b868713', name: 'BACON', description: '', price: 4, category: 'category-acrescimo', imageUrl: '', order: 0, inStock: true, syncStatus: 'synced' },
  { id: '5398fefe-1980-4e16-9204-cdd1fca65df1', name: 'CARNE', description: '', price: 3, category: 'category-acrescimo', imageUrl: '', order: 1, inStock: true, syncStatus: 'synced' },
  { id: '81350e4f-048d-46ba-b626-d190f6f35f9d', name: 'GAIROVA', description: '', price: 3, category: 'category-acrescimo', imageUrl: '', order: 2, inStock: true, syncStatus: 'synced' },
  { id: '157754b9-622f-47d4-b984-36c695eac71b', name: 'PIZZA', description: '', price: 3, category: 'category-acrescimo', imageUrl: '', order: 3, inStock: true, syncStatus: 'synced' },
  { id: '3ce3da23-2bc7-46a6-907d-a46a530baa9e', name: 'QUEIJO', description: '', price: 3, category: 'category-acrescimo', imageUrl: '', order: 4, inStock: true, syncStatus: 'synced' }
];

export const DEFAULT_INITIAL_MENU_FILLINGS: MenuItemFilling[] = [
  // Refrigerante 200ml vínculos
  { id: '9d50acd4-8fc4-4b83-ab12-1aaeeaf3379c_bebdab05-74fc-40c5-bcdd-26c7ae2d175a', menuItemId: '9d50acd4-8fc4-4b83-ab12-1aaeeaf3379c', fillingId: 'bebdab05-74fc-40c5-bcdd-26c7ae2d175a' },
  { id: '9d50acd4-8fc4-4b83-ab12-1aaeeaf3379c_e13dd117-6073-416e-9ab7-d1c2cc2a62df', menuItemId: '9d50acd4-8fc4-4b83-ab12-1aaeeaf3379c', fillingId: 'e13dd117-6073-416e-9ab7-d1c2cc2a62df' },

  // Refrigerante Lata vínculos
  { id: '0b7ae2d3-3e91-49c4-ab6c-67b0b245ce6f_1166caac-01b6-4720-97a2-2ecc7af3b33f', menuItemId: '0b7ae2d3-3e91-49c4-ab6c-67b0b245ce6f', fillingId: '1166caac-01b6-4720-97a2-2ecc7af3b33f' },
  { id: '0b7ae2d3-3e91-49c4-ab6c-67b0b245ce6f_c0caf44b-fd49-4686-87f1-9dc507b3100f', menuItemId: '0b7ae2d3-3e91-49c4-ab6c-67b0b245ce6f', fillingId: 'c0caf44b-fd49-4686-87f1-9dc507b3100f' },
  { id: '0b7ae2d3-3e91-49c4-ab6c-67b0b245ce6f_fa63419a-4606-4e70-869c-42033d8b6af4', menuItemId: '0b7ae2d3-3e91-49c4-ab6c-67b0b245ce6f', fillingId: 'fa63419a-4606-4e70-869c-42033d8b6af4' },
  { id: '0b7ae2d3-3e91-49c4-ab6c-67b0b245ce6f_419f1f20-c96b-44d1-ad41-c170959239e5', menuItemId: '0b7ae2d3-3e91-49c4-ab6c-67b0b245ce6f', fillingId: '419f1f20-c96b-44d1-ad41-c170959239e5' },
  { id: '0b7ae2d3-3e91-49c4-ab6c-67b0b245ce6f_13278aa2-c88c-405c-a82b-838669a8cc9e', menuItemId: '0b7ae2d3-3e91-49c4-ab6c-67b0b245ce6f', fillingId: '13278aa2-c88c-405c-a82b-838669a8cc9e' },
  { id: '0b7ae2d3-3e91-49c4-ab6c-67b0b245ce6f_80f42a14-82ea-49c7-ae7d-5db805a7b2c9', menuItemId: '0b7ae2d3-3e91-49c4-ab6c-67b0b245ce6f', fillingId: '80f42a14-82ea-49c7-ae7d-5db805a7b2c9' }
];
