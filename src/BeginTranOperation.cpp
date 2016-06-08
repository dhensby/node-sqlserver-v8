#include "stdafx.h"
#include "OdbcConnection.h"
#include "BeginTranOperation.h"

namespace mssql
{
	bool BeginTranOperation::TryInvokeOdbc()
	{
		return connection->TryBeginTran();
	}

	Local<Value> BeginTranOperation::CreateCompletionArg()
	{
		nodeTypeFactory fact;
		return fact.null();
	}
}
