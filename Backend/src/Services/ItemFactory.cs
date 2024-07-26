// <copyright company="Microsoft">
// Copyright (c) Microsoft. All rights reserved.
// </copyright>

using Boilerplate.Contracts;
using Boilerplate.Items;
using Fabric_Extension_BE_Boilerplate.Constants;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;

namespace Boilerplate.Services
{
    public class ItemFactory : IItemFactory
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IItemMetadataStore _itemMetadataStore;
        private readonly ILakehouseClientService _lakeHouseClientService;
        private readonly IAuthenticationService _authenticationService;
        private readonly IHttpClientService _httpClientService;

        public ItemFactory(
            IServiceProvider serviceProvider,
            IItemMetadataStore itemMetadataStore,
            ILakehouseClientService lakeHouseClientService,
            IAuthenticationService authenticationService,
            IHttpClientService httpClientService)
        {
            _serviceProvider = serviceProvider;
            _itemMetadataStore = itemMetadataStore;
            _lakeHouseClientService = lakeHouseClientService;
            _authenticationService = authenticationService;
            _httpClientService = httpClientService;
        }

        public IItem CreateItem(string itemType, AuthorizationContext authorizationContext)
        {
            switch (itemType)
            {
                case WorkloadConstants.ItemTypes.Item1:
                    return new ConvertItem(_serviceProvider.GetService<ILogger<ConvertItem>>(), _itemMetadataStore, _lakeHouseClientService, _authenticationService, authorizationContext, _httpClientService);

                default:
                    throw new NotSupportedException($"Items of type {itemType} are not supported");
            }
        }
    }
}
