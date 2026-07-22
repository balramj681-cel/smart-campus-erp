package com.smartcampus.erp.domain.shared.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PaymentMode {
    CASH           ("Cash"),
    ONLINE         ("Online Transfer"),
    CHEQUE         ("Cheque"),
    DEMAND_DRAFT   ("Demand Draft"),
    UPI            ("UPI");

    private final String displayName;
}