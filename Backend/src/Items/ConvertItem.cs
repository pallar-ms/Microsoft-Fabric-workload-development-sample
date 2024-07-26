// <copyright company="Microsoft">
// Copyright (c) Microsoft. All rights reserved.
// </copyright>

using Boilerplate.Constants;
using Boilerplate.Contracts;
using Boilerplate.Controllers;
using Boilerplate.Exceptions;
using Boilerplate.Services;
using Boilerplate.Utils;
using Fabric_Extension_BE_Boilerplate.Constants;
using Fabric_Extension_BE_Boilerplate.Contracts.FabricAPI.Workload;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Boilerplate.Items
{
    public class ConvertItem : ItemBase<ConvertItem, ConvertItemMetadata, ConvertItemClientMetadata>, IConvertItem
    {
        private static readonly IList<string> OneLakeScopes = new[] { $"{EnvironmentConstants.OneLakeResourceId}/.default" };

        private static readonly IList<string> FabricScopes = new[] { $"{EnvironmentConstants.FabricBackendResourceId}/Lakehouse.Read.All" };

        private readonly ILakehouseClientService _lakeHouseClientService;

        private readonly IAuthenticationService _authenticationService;

        private readonly IHttpClientService _httpClientService;

        private readonly AuthorizationContext _authorizationContext;

        private ConvertItemMetadata _metadata;

        public ConvertItem(
            ILogger<ConvertItem> logger,
            IItemMetadataStore itemMetadataStore,
            ILakehouseClientService lakeHouseClientService,
            IAuthenticationService authenticationService,
            AuthorizationContext authorizationContext,
            IHttpClientService httpClientService)
            : base(logger, itemMetadataStore, authorizationContext)
        {
            _lakeHouseClientService = lakeHouseClientService;
            _authenticationService = authenticationService;
            _httpClientService = httpClientService;
            _authorizationContext = authorizationContext;
        }

        public override string ItemType => WorkloadConstants.ItemTypes.Item1;

        public ItemReference Lakehouse => Metadata.Lakehouse;

        public string InputDataFileName => Metadata.InputDataFileName;

        public string TemplateFileName => Metadata.TemplateFileName;

        public string ConvertServiceEndpoint => Metadata.ConvertServiceEndpoint;

        public override async Task<ItemPayload> GetItemPayload()
        {
            var typeSpecificMetadata = GetTypeSpecificMetadata();

            FabricItem lakehouseItem = null;
            if (typeSpecificMetadata.Lakehouse.Id != Guid.Empty)
            {
                try
                {
                    var token = await _authenticationService.GetAccessTokenOnBehalfOf(AuthorizationContext, FabricScopes);
                    lakehouseItem = await _lakeHouseClientService.GetFabricLakehouse(token, typeSpecificMetadata.Lakehouse.WorkspaceId, typeSpecificMetadata.Lakehouse.Id);
                }
                catch (Exception ex)
                {
                    Logger.LogError($"Failed to retrieve FabricLakehouse for lakehouse: {typeSpecificMetadata.Lakehouse.Id} in workspace: {typeSpecificMetadata.Lakehouse.WorkspaceId}. Error: {ex.Message}");
                }
            }

            return new ItemPayload
            {
                ConvertItemMetadata = typeSpecificMetadata.ToClientMetadata(lakehouseItem)
            };
        }

        public override async Task ExecuteJob(string jobType, Guid jobInstanceId, JobInvokeType invokeType, CreateItemJobInstancePayload creationPayload)
        {
            var token = await _authenticationService.GetAccessTokenOnBehalfOf(AuthorizationContext, OneLakeScopes);

            var inputDataFileName = _metadata.InputDataFileName;
            var templateFileName = _metadata.TemplateFileName;
            var convertServiceEndpoint = _metadata.ConvertServiceEndpoint;

            // Conversion operation
            var result = await Convert(Lakehouse.WorkspaceId.ToString(), Lakehouse.Id.ToString(), inputDataFileName, templateFileName, convertServiceEndpoint);

            var convertedResult = JObject.Parse(result)["result"];

            // Write result to Lakehouse
            var filePath = GetLakehouseFilePath(jobType, jobInstanceId);
            await _lakeHouseClientService.WriteToLakehouseFile(token, filePath, convertedResult.ToString());
        }

        public override async Task<ItemJobInstanceState> GetJobState(string jobType, Guid jobInstanceId)
        {
            var token = await _authenticationService.GetAccessTokenOnBehalfOf(AuthorizationContext, OneLakeScopes);

            var filePath = GetLakehouseFilePath(jobType, jobInstanceId);
            var fileExists = await _lakeHouseClientService.CheckIfFileExists(token, filePath);

            return new ItemJobInstanceState
            {
                Status = fileExists ? JobInstanceStatus.Completed : JobInstanceStatus.InProgress,
            };
        }

        private string GetLakehouseFilePath(string jobType, Guid jobInstanceId)
        {
            var typeToFileName = new Dictionary<string, string>
            {
                { Item1JobType.ScheduledJob, $"ConversionResult_{jobInstanceId}.json" },
                { Item1JobType.ConvertOperation, $"ConversionResult_{jobInstanceId}.json" },
            };
            typeToFileName.TryGetValue(jobType, out var fileName);

            if (fileName != null)
            {
                return $"{_metadata.Lakehouse.WorkspaceId}/{_metadata.Lakehouse.Id}/Files/outputdata/{fileName}";
            }
            throw new NotSupportedException("Workload job type is not supported");
        }

        private ConvertItemMetadata Metadata => Ensure.NotNull(_metadata, "The item object must be initialized before use");

        protected override void SetDefinition(CreateItemPayload payload)
        {
            if (payload == null)
            {
                Logger.LogInformation("No payload is provided for {0}, objectId={1}", ItemType, ItemObjectId);
                _metadata = ConvertItemMetadata.Default.Clone();
                return;
            }

            if (payload.ConvertItemMetadata == null)
            {
                throw new InvalidItemPayloadException(ItemType, ItemObjectId);
            }

            if (payload.ConvertItemMetadata.Lakehouse == null)
            {
                throw new InvalidItemPayloadException(ItemType, ItemObjectId)
                    .WithDetail(ErrorCodes.ItemPayload.MissingLakehouseReference, "Missing Lakehouse reference");
            }

            _metadata = payload.ConvertItemMetadata.Clone();
        }

        protected override void UpdateDefinition(UpdateItemPayload payload)
        {
            if (payload == null)
            {
                Logger.LogInformation("No payload is provided for {0}, objectId={1}", ItemType, ItemObjectId);
                return;
            }

            if (payload.ConvertItemMetadata == null)
            {
                throw new InvalidItemPayloadException(ItemType, ItemObjectId);
            }

            if (payload.ConvertItemMetadata.Lakehouse == null)
            {
                throw new InvalidItemPayloadException(ItemType, ItemObjectId)
                    .WithDetail(ErrorCodes.ItemPayload.MissingLakehouseReference, "Missing Lakehouse reference");
            }

            SetTypeSpecificMetadata(payload.ConvertItemMetadata);
        }

        protected override void SetTypeSpecificMetadata(ConvertItemMetadata itemMetadata)
        {
            _metadata = itemMetadata.Clone();
        }

        protected override ConvertItemMetadata GetTypeSpecificMetadata()
        {
            return Metadata.Clone();
        }

        public async Task<string> Convert(string workspaceId, string lakehouseId, string inputDataFileName, string templateFileName, string convertServiceEndpoint)
        {
            var lakeHouseFilePath = $"{workspaceId}/{lakehouseId}/Files";

            var lakeHouseAccessToken = await _authenticationService.GetAccessTokenOnBehalfOf(_authorizationContext, LakehouseController.OneLakeScopes);
            var inputDataFilePath = $"{lakeHouseFilePath}/{inputDataFileName}";
            var inputData = await _lakeHouseClientService.GetLakehouseFile(lakeHouseAccessToken, inputDataFilePath);

            var templateFilePath = $"{lakeHouseFilePath}/{templateFileName}";
            var templateContent = await _lakeHouseClientService.GetLakehouseFile(lakeHouseAccessToken, templateFilePath);

            // Create the HTTP request
            var convertEndpoint = $"{convertServiceEndpoint}/convertToFhir?api-version=2024-05-01-preview";
            var convertRequestBody = new JObject
            {
                { "InputDataString", inputData },
                { "InputDataFormat", "Hl7v2" },
                { "RootTemplateName", "Hl7v2/ADT_A01" }
            };
            var requestBodyString = convertRequestBody.ToString();
            var content = new StringContent(requestBodyString, Encoding.UTF8, "application/json");
            var response = await _httpClientService.PostAsync(convertEndpoint, content, string.Empty);

            // Read the response
            var responseContent = await response.Content.ReadAsStringAsync();

            return responseContent;
        }
    }
}
