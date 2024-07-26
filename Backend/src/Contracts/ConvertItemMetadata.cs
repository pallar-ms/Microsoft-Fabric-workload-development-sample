// <copyright company="Microsoft">
// Copyright (c) Microsoft. All rights reserved.
// </copyright>

namespace Boilerplate.Contracts
{

    public abstract class ConvertItemMetadataBase<TLakehouse>
    {
        public string InputDataFileName { get; set; }
        public string TemplateFileName { get; set; }
        public string ConvertServiceEndpoint {get; set; }

        public TLakehouse Lakehouse { get; set; }
    }

    /// <summary>
    /// Represents the core metadata for item1 stored within the system's storage.
    /// </summary>
    public class ConvertItemMetadata: ConvertItemMetadataBase<FabricItem>
    {
        public static readonly ConvertItemMetadata Default = new ConvertItemMetadata { Lakehouse = new FabricItem() };

        public ConvertItemMetadata Clone()
        {
            return new ConvertItemMetadata
            {
                Lakehouse = Lakehouse,
                InputDataFileName = InputDataFileName,
                TemplateFileName = TemplateFileName,
                ConvertServiceEndpoint = ConvertServiceEndpoint
            };
        }

        public ConvertItemClientMetadata ToClientMetadata(FabricItem lakehouse)
        {
            return new ConvertItemClientMetadata()
            {
                InputDataFileName = InputDataFileName,
                TemplateFileName = TemplateFileName,
                Lakehouse = lakehouse,
                ConvertServiceEndpoint = ConvertServiceEndpoint
            };
        }
    }

    /// <summary>
    /// Represents extended metadata for item1, including additional information
    /// about the associated lakehouse, tailored for client-side usage.
    /// </summary>
    public class ConvertItemClientMetadata : ConvertItemMetadataBase<FabricItem> { };
}
