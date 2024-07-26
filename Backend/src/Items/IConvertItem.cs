// <copyright company="Microsoft">
// Copyright (c) Microsoft. All rights reserved.
// </copyright>

using Boilerplate.Contracts;
using System.Threading.Tasks;

namespace Boilerplate.Items
{
    public interface IConvertItem : IItem
    {
        ItemReference Lakehouse { get; }

        string InputDataFileName { get; }

        string TemplateFileName { get; }

        string ConvertServiceEndpoint { get; }

        /// <summary>
        /// Performs conversion operation
        /// </summary>
        /// <returns>A task representing the asynchronous operation. The result is a converted result string</returns>
        Task<string> Convert(string workspaceId, string lakehouseId, string inputDataFileName, string templateFileName, string convertServiceEndpoint);
    }
}
